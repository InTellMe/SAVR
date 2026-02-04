"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractIngredientsFromImage = extractIngredientsFromImage;
exports.generateRecipe = generateRecipe;
exports.generateMealPlan = generateMealPlan;
exports.generateGroceryList = generateGroceryList;
exports.chatAssistant = chatAssistant;
const openai_1 = __importDefault(require("openai"));
const vision_1 = __importDefault(require("@google-cloud/vision"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const visionClient = new vision_1.default.ImageAnnotatorClient();
async function extractIngredientsFromImage(imageUrl) {
    try {
        // Try OpenAI Vision first
        return await extractWithOpenAI(imageUrl);
    }
    catch (error) {
        console.error('OpenAI Vision failed, falling back to Google Vision:', error);
        // Fallback to Google Vision
        return await extractWithGoogleVision(imageUrl);
    }
}
async function extractWithOpenAI(imageUrl) {
    const response = await openai.chat.completions.create({
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
    });
    const content = response.choices[0]?.message?.content || '[]';
    // Parse the JSON response
    try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const ingredients = JSON.parse(cleanContent);
        return ingredients;
    }
    catch (error) {
        console.error('Failed to parse OpenAI response:', content);
        throw error;
    }
}
async function extractWithGoogleVision(imageUrl) {
    const [result] = await visionClient.labelDetection(imageUrl);
    const labels = result.labelAnnotations || [];
    // Use GPT-4 to process Google Vision labels into structured ingredients
    const labelText = labels.map(label => `${label.description} (confidence: ${label.score})`).join(', ');
    const response = await openai.chat.completions.create({
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
    });
    const content = response.choices[0]?.message?.content || '[]';
    try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    }
    catch (error) {
        console.error('Failed to parse Google Vision response:', content);
        return [];
    }
}
async function generateRecipe(availableIngredients, preferences) {
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
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
    });
    const content = response.choices[0]?.message?.content || '{}';
    try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    }
    catch (error) {
        console.error('Failed to parse recipe response:', content);
        throw error;
    }
}
async function generateMealPlan(days, availableIngredients, preferences) {
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
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
    });
    const content = response.choices[0]?.message?.content || '{}';
    try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    }
    catch (error) {
        console.error('Failed to parse meal plan response:', content);
        throw error;
    }
}
async function generateGroceryList(recipes, currentInventory) {
    const prompt = `Generate a grocery list for these recipes:
${recipes.map(r => `- ${r.title}: ${r.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')}`).join('\n')}

Current inventory: ${currentInventory.join(', ')}

Return a JSON array of items needed (excluding current inventory):
[{"name": "item", "quantity": 1, "unit": "unit", "category": "produce|dairy|meat|pantry"}]

Only return the JSON array, no other text.`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
    });
    const content = response.choices[0]?.message?.content || '[]';
    try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
    }
    catch (error) {
        console.error('Failed to parse grocery list response:', content);
        return [];
    }
}
async function chatAssistant(message, conversationHistory, context) {
    const systemPrompt = `You are a helpful cooking assistant for PantryHustler app. 
${context?.inventory?.length ? `User's current inventory: ${context.inventory.join(', ')}` : ''}
${context?.currentRecipe ? `Current recipe: ${context.currentRecipe.title}` : ''}

Help users with:
- Cooking techniques and tips
- Recipe substitutions
- Ingredient questions
- Meal planning advice
- Kitchen safety

Be concise, friendly, and practical.`;
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
    ];
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.7,
    });
    return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
}
//# sourceMappingURL=ai.js.map