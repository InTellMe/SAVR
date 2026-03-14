import OpenAI from 'openai';
import vision from '@google-cloud/vision';
import {
  AiGroceryItem,
  AiMealPlan,
  AiRecipe,
  ExtractedIngredient,
  Recipe,
  SubstitutionOption,
} from '../types/functions';
import { normalizeAiIngredients, aiIngredientsToExtracted } from '../utils/units';
import { filterIngredientsForPet, PET_RECIPE_DISCLAIMER } from '../config/forbiddenFoods';

// Lazy initialization to avoid instantiation during build
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is required. ' +
        'Please configure it in your Vercel environment.'
      );
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// Lazy initialization to avoid instantiation (and Google Cloud credential lookup) during build
let visionClientInstance: InstanceType<typeof vision.ImageAnnotatorClient> | null = null;

function getVisionClient(): InstanceType<typeof vision.ImageAnnotatorClient> {
  if (!visionClientInstance) {
    visionClientInstance = new vision.ImageAnnotatorClient();
  }
  return visionClientInstance;
}

function isRetryableOpenAIError(error: unknown): boolean {
  const errorWithStatus = error as { status?: number; response?: { status?: number } };
  const status = errorWithStatus?.status ?? errorWithStatus?.response?.status;
  if (!status) return false;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

async function callOpenAIWithFallback(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  options?: {
    primaryModel?: string;
    fallbackModel?: string;
  }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const primaryModel =
    options?.primaryModel || (params.model as string) || process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o';
  const fallbackModel =
    options?.fallbackModel || process.env.OPENAI_MODEL_FALLBACK || 'gpt-4o-mini';

  try {
    const response = await getOpenAI().chat.completions.create({
      ...params,
      model: primaryModel,
      stream: false,
    });
    return response as OpenAI.Chat.Completions.ChatCompletion;
  } catch (error: unknown) {
    if (!isRetryableOpenAIError(error)) {
      throw error;
    }

    console.error(
      `OpenAI primary model "${primaryModel}" failed, falling back to "${fallbackModel}":`,
      error
    );

    const response = await getOpenAI().chat.completions.create({
      ...params,
      model: fallbackModel,
      stream: false,
    });
    return response as OpenAI.Chat.Completions.ChatCompletion;
  }
}

function extractContentFromCompletion(
  completion: OpenAI.Chat.Completions.ChatCompletion
): string {
  return completion.choices[0]?.message?.content || '';
}

function parseJsonFromModel<T>(rawContent: string, defaultValue: T, logContext: string): T {
  const content = rawContent || '';
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/gi, '').trim();
    if (!cleanContent) {
      return defaultValue;
    }
    return JSON.parse(cleanContent) as T;
  } catch (error) {
    console.error(`Failed to parse JSON from model for ${logContext}:`, content);
    throw error;
  }
}

export async function extractIngredientsFromImage(
  imageUrl: string
): Promise<ExtractedIngredient[]> {
  try {
    // Try OpenAI Vision first
    return await extractWithOpenAI(imageUrl);
  } catch (error) {
    console.error('OpenAI Vision failed, falling back to Google Vision:', error);
    // Fallback to Google Vision
    return await extractWithGoogleVision(imageUrl);
  }
}

async function extractWithOpenAI(imageUrl: string): Promise<ExtractedIngredient[]> {
  const completion = await callOpenAIWithFallback(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image of a pantry, fridge, or food items. Extract all visible food items and ingredients. 
For each item, provide:
1. Name of the item
2. Estimated quantity (use 1 if not clearly countable)
3. Unit (pieces, bottles, cans, packages, or specific units like cups, lbs)

Return the results as a JSON array with this exact structure:
[{"name": "item name", "quantity": number, "unit": "unit", "confidence": 0.95}]

Only return the JSON array, no other text.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 1000,
    },
    {
      // Ensure we stay on a vision-capable family of models
      primaryModel: process.env.OPENAI_MODEL_VISION_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_VISION_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '[]';
  
  // Parse the JSON response
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const ingredients = JSON.parse(cleanContent);
    return aiIngredientsToExtracted(normalizeAiIngredients(ingredients));
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content);
    throw error;
  }
}

async function extractWithGoogleVision(imageUrl: string): Promise<ExtractedIngredient[]> {
  const [result] = await getVisionClient().labelDetection(imageUrl);
  const labels = result.labelAnnotations || [];

  // Use GPT-4 to process Google Vision labels into structured ingredients
  const labelText = labels.map(label => `${label.description} (confidence: ${label.score})`).join(', ');

  const completion = await callOpenAIWithFallback(
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Based on these image labels from a pantry/fridge photo: ${labelText}
        
Extract likely food items and ingredients. For each item, provide:
{"name": "item name", "quantity": 1, "unit": "item", "confidence": score}

Return as JSON array only, no other text.`,
        },
      ],
      max_tokens: 500,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_VISION_SECONDARY_PRIMARY || 'gpt-4o-mini',
      fallbackModel: process.env.OPENAI_MODEL_VISION_SECONDARY_FALLBACK || 'gpt-4o',
    }
  );

  const content = extractContentFromCompletion(completion) || '[]';
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const ingredients = JSON.parse(cleanContent);
    return aiIngredientsToExtracted(normalizeAiIngredients(ingredients));
  } catch (error) {
    console.error('Failed to parse Google Vision response:', content);
    return [];
  }
}

export type RecipeMode = 'human' | 'pet';
export type PetSpecies = 'cat' | 'dog';

export interface GenerateRecipeOptions {
  mode?: RecipeMode;
  species?: PetSpecies;
}

export interface GenerateRecipeResult {
  recipe: AiRecipe;
  removedForSafety: string[];
}

export async function generateRecipe(
  availableIngredients: string[],
  preferences?: {
    cuisine?: string;
    dietary?: string[];
    difficulty?: string;
    cookTime?: number;
  },
  options?: GenerateRecipeOptions
): Promise<GenerateRecipeResult> {
  const mode = options?.mode ?? 'human';
  const species = options?.species ?? 'dog';
  let ingredientsToUse = availableIngredients;
  let removedForSafety: string[] = [];

  if (mode === 'pet') {
    const { safe, removed } = filterIngredientsForPet(availableIngredients, species);
    ingredientsToUse = safe;
    removedForSafety = removed;
  }

  const isPet = mode === 'pet';
  const petSafetyBrief =
    isPet &&
    `CRITICAL: You are generating a recipe for a ${species}. 
- Use ONLY these safe ingredients (already filtered): ${ingredientsToUse.join(', ')}. Do NOT add any ingredient not in this list.
- Never include: chocolate, grapes, raisins, onions, garlic, xylitol, avocado, macadamia nuts, alcohol, or any toxic human foods.
- Keep the recipe simple: minimal ingredients, NO added salt, sugar, or seasoning. Appropriate portion sizes for a ${species}.
- For cats: focus on animal protein (obligate carnivores). For dogs: lean proteins, some vegetables, whole grains are ok.
- Output a treat or small meal recipe only.`;

  const basePrompt = isPet
    ? `${petSafetyBrief}

Create a simple, safe ${species} treat or meal recipe using ONLY these ingredients: ${ingredientsToUse.join(', ') || 'none - suggest they add safe ingredients'}.

Return a JSON object with this exact structure:
{
  "title": "Recipe Name (e.g. Simple Dog Treats)",
  "description": "Brief description noting it is for ${species}.",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["step 1", "step 2"],
  "prepTime": 5,
  "cookTime": 15,
  "servings": 1,
  "difficulty": "easy",
  "cuisine": "pet",
  "dietaryTags": ["pet-safe", "${species}"]
}

After the JSON, append on a new line this exact disclaimer text (include it in the recipe description or as a final instruction): ${PET_RECIPE_DISCLAIMER}

Only return the JSON object, then a newline, then the disclaimer. No other text.`
    : `Create a detailed recipe using these available ingredients: ${ingredientsToUse.join(', ')}

${preferences?.cuisine ? `Cuisine: ${preferences.cuisine}` : ''}
${preferences?.dietary?.length ? `Dietary requirements (strictly follow): ${preferences.dietary.join(', ')}. For diabetic-friendly use low added sugar and high fiber; for keto keep carbs very low; for paleo avoid grains/legumes/dairy; for low-sodium minimize salt.` : ''}
${preferences?.difficulty ? `Difficulty: ${preferences.difficulty}` : ''}
${preferences?.cookTime ? `Maximum cook time: ${preferences.cookTime} minutes` : ''}

IMPORTANT: You MUST include accurate estimated nutritional information per serving in the "nutrition" field. Calculate based on standard USDA nutritional data for the ingredients and quantities used. This is critical for users tracking dietary goals.
${preferences?.dietary?.length ? `The nutritional values must be consistent with the dietary requirements: ${preferences.dietary.join(', ')}. For example, keto recipes should show very low carbs (<20g), low-fat should show <10g fat, etc.` : ''}

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["step 1", "step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "dietaryTags": ["tag1", "tag2"],
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 580
  }
}

The "nutrition" field represents estimated values PER SERVING. Calories in kcal, protein/carbs/fat/fiber/sugar in grams, sodium in milligrams.

Only return the JSON object, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      messages: [{ role: 'user', content: basePrompt }],
      max_tokens: 2000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_RECIPE_FALLBACK || 'gpt-4o-mini',
    }
  );

  let content = extractContentFromCompletion(completion) || '{}';
  // Strip disclaimer from content so we parse only JSON
  if (isPet && content.includes(PET_RECIPE_DISCLAIMER)) {
    content = content.replace(PET_RECIPE_DISCLAIMER, '').trim();
  }
  const recipe = parseJsonFromModel<AiRecipe>(content, {} as AiRecipe, 'generateRecipe');
  if (isPet && recipe.description && !recipe.description.includes(PET_RECIPE_DISCLAIMER)) {
    recipe.description = `${recipe.description}\n\n${PET_RECIPE_DISCLAIMER}`;
  }
  return { recipe, removedForSafety };
}

export async function generateMealPlan(
  days: number,
  availableIngredients: string[],
  preferences?: {
    mealsPerDay?: number;
    dietary?: string[];
    variety?: boolean;
  }
): Promise<AiMealPlan> {
  const mealsPerDay = preferences?.mealsPerDay || 3;
  
  const prompt = `Create a ${days}-day meal plan with ${mealsPerDay} meals per day.
Available ingredients: ${availableIngredients.join(', ')}
${preferences?.dietary?.length ? `Dietary restrictions (MUST follow strictly): ${preferences.dietary.join(', ')}. Ensure every meal complies with these restrictions. For keto: <20g carbs/meal. For diabetic-friendly: low sugar, high fiber. For low-sodium: <500mg sodium/meal.` : ''}
${preferences?.variety ? 'Ensure variety in meals — avoid repeating the same dish within a 3-day window.' : ''}

IMPORTANT: You MUST include estimated nutritional information for EVERY meal and a daily summary. This is critical for users tracking dietary compliance. Calculate values based on standard USDA nutritional data.
${preferences?.dietary?.length ? `Nutritional values MUST be consistent with the dietary restrictions: ${preferences.dietary.join(', ')}. Flag any meal that might be borderline.` : ''}

Return a JSON object with this structure:
{
  "name": "Meal Plan Name",
  "meals": [
    {
      "day": 1,
      "mealType": "breakfast|lunch|dinner",
      "recipeName": "Recipe Name",
      "ingredients": ["ingredient1", "ingredient2"],
      "nutrition": {
        "calories": 450,
        "protein": 25,
        "carbs": 40,
        "fat": 18,
        "fiber": 6,
        "sugar": 8,
        "sodium": 580
      }
    }
  ],
  "dailyNutritionSummary": [
    {
      "day": 1,
      "totals": {
        "calories": 1800,
        "protein": 80,
        "carbs": 200,
        "fat": 60,
        "fiber": 25,
        "sugar": 40,
        "sodium": 1800
      }
    }
  ]
}

The "nutrition" field on each meal is PER SERVING. Calories in kcal, protein/carbs/fat/fiber/sugar in grams, sodium in milligrams. The "dailyNutritionSummary" should sum all meals for each day.

Only return the JSON object, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_MEAL_PLAN_PRIMARY || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_MEAL_PLAN_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_MEAL_PLAN_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '{}';
  return parseJsonFromModel<AiMealPlan>(content, {} as AiMealPlan, 'generateMealPlan');
}

export async function generateGroceryList(
  recipes: Array<Pick<Recipe, 'title' | 'ingredients'>>,
  currentInventory: string[]
): Promise<AiGroceryItem[]> {
  const prompt = `Generate a grocery list for these recipes:
${recipes.map(r => `- ${r.title}: ${r.ingredients.map((i: Recipe['ingredients'][number]) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}`).join('\n')}

Current inventory: ${currentInventory.join(', ')}

Return a JSON array of items needed (excluding current inventory):
[{"name": "item", "quantity": 1, "unit": "unit", "category": "produce|dairy|meat|pantry"}]

Only return the JSON array, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_GROCERY_PRIMARY || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_GROCERY_PRIMARY || 'gpt-4o-mini',
      fallbackModel: process.env.OPENAI_MODEL_GROCERY_FALLBACK || 'gpt-4o',
    }
  );

  const content = extractContentFromCompletion(completion) || '[]';
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent) as AiGroceryItem[];
  } catch (error) {
    console.error('Failed to parse grocery list response:', content);
    return [];
  }
}

export async function chatAssistant(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: {
    inventory?: string[];
    currentRecipe?: Pick<Recipe, 'title' | 'description' | 'ingredients' | 'instructions' | 'nutrition'>;
    dietaryPreferences?: string[];
    currentStep?: number;
  }
): Promise<string> {
  const recipeContext = context?.currentRecipe
    ? `The user is currently cooking: "${context.currentRecipe.title}".
Description: ${context.currentRecipe.description}
Ingredients: ${context.currentRecipe.ingredients?.map((i: Recipe['ingredients'][number]) => `${i.quantity} ${i.unit} ${i.name}`).join(', ') || 'N/A'}
Instructions:
${context.currentRecipe.instructions?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || 'N/A'}
${context.currentStep !== undefined ? `They are currently on step ${context.currentStep + 1} of ${context.currentRecipe.instructions?.length || '?'}.` : ''}
${context.currentRecipe.nutrition ? `Nutritional info per serving: ${context.currentRecipe.nutrition.calories} cal, ${context.currentRecipe.nutrition.protein}g protein, ${context.currentRecipe.nutrition.carbs}g carbs, ${context.currentRecipe.nutrition.fat}g fat` : ''}`
    : '';

  const systemPrompt = `You are SAVR Chef, an expert AI cooking assistant built into the SAVR app. You combine the approachability of a home cook with the expertise of a professional chef. You are knowledgeable about global cuisines, nutrition, food science, dietary restrictions, and food safety.

## Your capabilities
- **Recipe guidance**: Walk users through any recipe step-by-step, explain techniques (sauteing, braising, tempering chocolate, etc.), and troubleshoot issues in real time.
- **Ingredient substitutions**: Suggest practical swaps for missing, allergenic, or dietary-restricted ingredients. Always note if a substitution changes texture, flavor, or cook time.
- **Meal planning & prep**: Help plan balanced weekly meals, batch-cooking strategies, and efficient grocery lists.
- **Nutrition awareness**: Provide general nutritional info. Respect dietary needs (diabetic-friendly, keto, paleo, low-sodium, vegan, halal, kosher, etc.) and flag when a suggestion may conflict with a stated restriction.
- **Food safety**: Advise on safe internal temperatures, cross-contamination prevention, proper storage times, and allergen handling.
- **Pet-safe cooking**: If asked about pet recipes, emphasize safety — never recommend chocolate, grapes, raisins, onions, garlic, xylitol, avocado, macadamia nuts, or other toxic foods. Always recommend consulting a veterinarian.
- **Pantry optimization**: Help users use up ingredients before they expire, minimize waste, and make the most of what they have.

## Context
${context?.inventory?.length ? `The user currently has these items in their pantry: ${context.inventory.join(', ')}.` : 'No pantry inventory is loaded right now.'}
${recipeContext}
${context?.dietaryPreferences?.length ? `The user follows these dietary preferences: ${context.dietaryPreferences.join(', ')}. Always keep suggestions compliant with these restrictions.` : ''}

## Guidelines
- Be concise but thorough. Use short paragraphs and bullet points for clarity.
- When providing a recipe inline, format it clearly with ingredients and numbered steps.
- If the user is actively cooking, focus your answers on their current step and recipe. Be practical and time-sensitive.
- If unsure about a food safety question or a medical/dietary claim, say so and recommend consulting a professional.
- Never provide medical, veterinary, or legal advice — only general culinary guidance.
- Be warm, encouraging, and supportive. Cooking should feel fun, not intimidating.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message },
  ];
  try {
    const completion = await callOpenAIWithFallback(
      {
        model: process.env.OPENAI_MODEL_CHAT_PRIMARY || 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        primaryModel: process.env.OPENAI_MODEL_CHAT_PRIMARY || 'gpt-4o',
        fallbackModel: process.env.OPENAI_MODEL_CHAT_FALLBACK || 'gpt-4o-mini',
      }
    );

    const content = extractContentFromCompletion(completion);
    return content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Chat assistant failed for SAVR Chef conversation:', {
      error,
      hasContext: !!context,
      hasInventory: !!context?.inventory?.length,
      hasRecipe: !!context?.currentRecipe,
      hasDietaryPreferences: !!context?.dietaryPreferences?.length,
    });
    return 'I ran into a temporary issue generating a response. Please try again in a moment.';
  }
}

// Ingredient substitution with inventory and recipe context awareness
export async function getSubstitutions(
  ingredientName: string,
  ingredientQuantity: number,
  ingredientUnit: string,
  recipeTitle: string,
  recipeIngredients: Array<{ name: string; quantity: number; unit: string }>,
  recipeInstructions: string[],
  inventoryItems: Array<{ name: string; quantity: number; unit: string }>
): Promise<SubstitutionOption[]> {
  const inventoryList = inventoryItems.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(', ');
  const otherIngredients = recipeIngredients
    .filter(i => i.name.toLowerCase() !== ingredientName.toLowerCase())
    .map(i => `${i.quantity} ${i.unit} ${i.name}`)
    .join(', ');

  const prompt = `I need a substitution for "${ingredientQuantity} ${ingredientUnit} ${ingredientName}" in the recipe "${recipeTitle}".

Other recipe ingredients: ${otherIngredients}
Recipe steps (for understanding the ingredient's role): ${recipeInstructions.join(' | ')}

The user currently has these items in their inventory: ${inventoryList || 'nothing listed'}

Provide 3-5 substitution options. For each option:
1. Prioritize items the user HAS in their inventory
2. Include the exact quantity and unit needed (converted to match the original)
3. Note whether the user has this item (true/false based on inventory)
4. Describe the impact on taste, texture, or cooking process

Return a JSON array with this exact structure:
[{
  "name": "substitute ingredient name",
  "quantity": 1,
  "unit": "cup",
  "inInventory": true,
  "impactNotes": "Brief note about flavor/texture changes and any cooking adjustments needed"
}]

Sort by: items in inventory first, then by best substitution quality. Only return the JSON array, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '[]';
  return parseJsonFromModel<SubstitutionOption[]>(content, [], 'getSubstitutions');
}

// Import recipe from URL by extracting structured data
export async function importRecipeFromUrl(url: string): Promise<AiRecipe> {
  const prompt = `I have a recipe from this URL: ${url}

Please fetch/analyze this URL and extract the recipe into a structured format. If the URL contains schema.org/Recipe JSON-LD data, use that. Otherwise, extract from the page content.

IMPORTANT: Include accurate estimated nutritional information per serving based on the ingredients and quantities.

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["step 1", "step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "dietaryTags": ["tag1", "tag2"],
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 580
  }
}

Only return the JSON object, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_RECIPE_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '{}';
  return parseJsonFromModel<AiRecipe>(content, {} as AiRecipe, 'importRecipeFromUrl');
}

// Import recipe from an image (photo of recipe card, screenshot, etc.)
export async function importRecipeFromImage(imageUrl: string): Promise<AiRecipe> {
  const completion = await callOpenAIWithFallback(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This image contains a recipe (cookbook page, recipe card, screenshot, etc.). Extract the complete recipe from this image.

IMPORTANT: Include accurate estimated nutritional information per serving based on the ingredients and quantities.

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["step 1", "step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "dietaryTags": ["tag1", "tag2"],
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 580
  }
}

Only return the JSON object, no other text.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 2000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_VISION_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_VISION_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '{}';
  return parseJsonFromModel<AiRecipe>(content, {} as AiRecipe, 'importRecipeFromImage');
}

// Import recipe from PDF text content
export async function importRecipeFromText(pdfText: string): Promise<AiRecipe> {
  const prompt = `The following is text extracted from a PDF or document containing a recipe. Extract the recipe into a structured format.

Text content:
${pdfText.substring(0, 4000)}

IMPORTANT: Include accurate estimated nutritional information per serving based on the ingredients and quantities.

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["step 1", "step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "dietaryTags": ["tag1", "tag2"],
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 580
  }
}

Only return the JSON object, no other text.`;

  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_RECIPE_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '{}';
  return parseJsonFromModel<AiRecipe>(content, {} as AiRecipe, 'importRecipeFromText');
}

// Extract items from a receipt image
export async function extractFromReceipt(
  imageUrl: string
): Promise<Array<{ name: string; quantity: number; unit: string; price?: number }>> {
  const completion = await callOpenAIWithFallback(
    {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This image is a grocery store receipt. Extract all food items purchased.

For each item, provide:
1. Name of the food item (clean, standardized name — e.g., "Whole Milk" not "GRVLY 2% MLK")
2. Quantity purchased (default to 1 if unclear)
3. Unit (pieces, lbs, oz, bottles, cans, packages, etc.)
4. Price if visible (in dollars)

Return a JSON array with this exact structure:
[{"name": "item name", "quantity": 1, "unit": "piece", "price": 3.99}]

Only include food items, not bags, tax, totals, or non-food products. Only return the JSON array, no other text.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 1500,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_VISION_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_VISION_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '[]';
  return parseJsonFromModel<Array<{ name: string; quantity: number; unit: string; price?: number }>>(
    content,
    [],
    'extractFromReceipt'
  );
}
