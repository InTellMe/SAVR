import OpenAI from 'openai';
import vision from '@google-cloud/vision';
import {
  AiGroceryItem,
  AiMealPlan,
  AiRecipe,
  ExtractedIngredient,
  Recipe,
} from '../types';
import { normalizeAiIngredients, aiIngredientsToExtracted } from '../utils/units';
import { filterIngredientsForPet, PET_RECIPE_DISCLAIMER } from '../config/forbiddenFoods';

// Lazy initialization to avoid instantiation during Firebase deployment analysis
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    // Firebase deployment analysis doesn't set FUNCTION_NAME or FUNCTION_TARGET
    // Use dummy key only during build/analysis, fail fast at runtime if missing
    const isDeploymentAnalysis = !process.env.FUNCTION_NAME && !process.env.FUNCTION_TARGET;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      if (isDeploymentAnalysis) {
        // Allow dummy key during Firebase deployment analysis
        openaiInstance = new OpenAI({ apiKey: 'dummy_key_for_build' });
      } else {
        // Fail fast at runtime with clear error
        throw new Error(
          'OPENAI_API_KEY environment variable is required. ' +
          'Please configure it in your Firebase Functions environment.'
        );
      }
    } else {
      openaiInstance = new OpenAI({ apiKey });
    }
  }
  return openaiInstance;
}

const visionClient = new vision.ImageAnnotatorClient();

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
  const [result] = await visionClient.labelDetection(imageUrl);
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
  "dietaryTags": ["tag1", "tag2"]
}

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
${preferences?.dietary?.length ? `Dietary restrictions: ${preferences.dietary.join(', ')}` : ''}
${preferences?.variety ? 'Ensure variety in meals.' : ''}

Return a JSON object with this structure:
{
  "name": "Meal Plan Name",
  "meals": [
    {
      "day": 1,
      "mealType": "breakfast|lunch|dinner",
      "recipeName": "Recipe Name",
      "ingredients": ["ingredient1", "ingredient2"]
    }
  ]
}

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
    currentRecipe?: Pick<Recipe, 'title'>;
  }
): Promise<string> {
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
${context?.currentRecipe ? `The user is currently looking at: "${context.currentRecipe.title}".` : ''}

## Guidelines
- Be concise but thorough. Use short paragraphs and bullet points for clarity.
- When providing a recipe inline, format it clearly with ingredients and numbered steps.
- If unsure about a food safety question or a medical/dietary claim, say so and recommend consulting a professional.
- Never provide medical, veterinary, or legal advice — only general culinary guidance.
- Be warm, encouraging, and supportive. Cooking should feel fun, not intimidating.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message },
  ];
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
}
