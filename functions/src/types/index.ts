// Type definitions for Pantry Chef
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: 'free' | 'pro';
  subscriptionStatus?: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId?: string;
  paypalSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: Date;
  addedDate: Date;
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
  generatedBy: 'ai' | 'user';
  createdAt: Date;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  meals: Array<{
    date: Date;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipeId?: string;
    recipeName: string;
  }>;
  createdAt: Date;
}

export interface GroceryList {
  id: string;
  userId: string;
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    checked: boolean;
    category?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
}

// Canonical units used across AI-generated ingredients and grocery items
export type CanonicalUnit =
  | 'piece'
  | 'can'
  | 'bottle'
  | 'package'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'lb'
  | 'oz';

// Core AI ingredient representation (before being stored as inventory or recipe ingredients)
export interface AiIngredient {
  name: string;
  quantity: number;
  unit: CanonicalUnit | string;
  approximate?: boolean;
  confidence?: number;
}

export interface AiRecipe {
  title: string;
  description: string;
  ingredients: AiIngredient[];
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
}

export interface AiMeal {
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeName: string;
  ingredients: string[];
}

export interface AiMealPlan {
  name: string;
  meals: AiMeal[];
}

export interface AiGroceryItem {
  name: string;
  quantity: number;
  unit: CanonicalUnit | string;
  category: 'produce' | 'dairy' | 'meat' | 'pantry' | string;
}

export interface AiGroceryList {
  items: AiGroceryItem[];
}

// Cloud Functions request/response contracts for AI endpoints

export interface AnalyzeImageRequest {
  imageUrl: string;
}

export interface AnalyzeImageResponse {
  success: boolean;
  ingredients: ExtractedIngredient[];
}

export interface CreateRecipeRequest {
  ingredients: string[];
  preferences?: {
    cuisine?: string;
    dietary?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    cookTime?: number;
  };
}

export interface CreateRecipeResponse {
  success: boolean;
  recipeId: string;
  recipe: AiRecipe;
}

export interface CreateMealPlanRequest {
  days: number;
  ingredients: string[];
  preferences?: {
    mealsPerDay?: number;
    dietary?: string[];
    variety?: boolean;
  };
}

export interface CreateMealPlanResponse {
  success: boolean;
  mealPlanId: string;
  mealPlan: AiMealPlan;
}

export interface CreateGroceryListRequest {
  recipeIds: string[];
}

export interface CreateGroceryListResponse {
  success: boolean;
  listId: string;
  items: AiGroceryItem[];
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatHistoryMessage[];
  contextData?: {
    inventory?: string[];
    currentRecipe?: any;
  };
}

export interface ChatResponse {
  success: boolean;
  response: string;
}

export interface SubscriptionTier {
  name: 'free' | 'pro';
  maxInventoryItems: number;
  maxRecipesPerMonth: number;
  maxMealPlansPerMonth: number;
  aiChatEnabled: boolean;
  advancedFeatures: boolean;
}

export const TIER_LIMITS: Record<'free' | 'pro', SubscriptionTier> = {
  free: {
    name: 'free',
    maxInventoryItems: 50,
    maxRecipesPerMonth: 10,
    maxMealPlansPerMonth: 2,
    aiChatEnabled: false,
    advancedFeatures: false,
  },
  pro: {
    name: 'pro',
    maxInventoryItems: -1, // unlimited
    maxRecipesPerMonth: -1, // unlimited
    maxMealPlansPerMonth: -1, // unlimited
    aiChatEnabled: true,
    advancedFeatures: true,
  },
};
