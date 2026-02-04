import OpenAI from 'openai';
import vision from '@google-cloud/vision';
import {
  AiGroceryItem,
  AiMealPlan,
  AiRecipe,
  ExtractedIngredient,
} from '../types';
import { normalizeAiIngredients } from '../utils/units';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const visionClient = new vision.ImageAnnotatorClient();

function isRetryableOpenAIError(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
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
    return await openai.chat.completions.create({
      ...params,
      model: primaryModel,
    });
  } catch (error: any) {
    if (!isRetryableOpenAIError(error)) {
      throw error;
    }

    console.error(
      `OpenAI primary model "${primaryModel}" failed, falling back to "${fallbackModel}":`,
      error
    );

    return await openai.chat.completions.create({
      ...params,
      model: fallbackModel,
    });
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
    return normalizeAiIngredients(ingredients);
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
    return normalizeAiIngredients(ingredients);
  } catch (error) {
    console.error('Failed to parse Google Vision response:', content);
    return [];
  }
}

export async function generateRecipe(
  availableIngredients: string[],
  preferences?: {
    cuisine?: string;
    dietary?: string[];
    difficulty?: string;
    cookTime?: number;
  }
): Promise<AiRecipe> {
  const prompt = `Create a detailed recipe using these available ingredients: ${availableIngredients.join(', ')}

${preferences?.cuisine ? `Cuisine: ${preferences.cuisine}` : ''}
${preferences?.dietary?.length ? `Dietary restrictions: ${preferences.dietary.join(', ')}` : ''}
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
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    },
    {
      primaryModel: process.env.OPENAI_MODEL_RECIPE_PRIMARY || 'gpt-4o',
      fallbackModel: process.env.OPENAI_MODEL_RECIPE_FALLBACK || 'gpt-4o-mini',
    }
  );

  const content = extractContentFromCompletion(completion) || '{}';
  return parseJsonFromModel<AiRecipe>(content, {} as AiRecipe, 'generateRecipe');
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
  recipes: any[],
  currentInventory: string[]
): Promise<AiGroceryItem[]> {
  const prompt = `Generate a grocery list for these recipes:
${recipes.map(r => `- ${r.title}: ${r.ingredients.map((i: any) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}`).join('\n')}

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
    currentRecipe?: any;
  }
): Promise<string> {
  const systemPrompt = `You are a helpful cooking assistant for Pantry Chef app. 
${context?.inventory?.length ? `User's current inventory: ${context.inventory.join(', ')}` : ''}
${context?.currentRecipe ? `Current recipe: ${context.currentRecipe.title}` : ''}

Help users with:
- Cooking techniques and tips
- Recipe substitutions
- Ingredient questions
- Meal planning advice
- Kitchen safety

Be concise, friendly, and practical.`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message },
  ];
  const completion = await callOpenAIWithFallback(
    {
      model: process.env.OPENAI_MODEL_CHAT_PRIMARY || 'gpt-4o',
      messages,
      max_tokens: 500,
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
