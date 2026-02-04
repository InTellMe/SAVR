// Lightweight web-side types aligned with backend contracts

export type SubscriptionTierName = 'free' | 'pro';

export interface WebInventoryItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: string;
  addedDate?: string;
  imageUrl?: string | null;
}

export interface WebRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface WebRecipe {
  id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: WebRecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
  generatedBy?: 'ai' | 'user';
  createdAt?: string;
}

export interface WebMealPlanMeal {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  recipeName: string;
}

export interface WebMealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: WebMealPlanMeal[];
  createdAt?: string;
}

export interface WebGroceryItem {
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category?: string;
}

export interface WebGroceryList {
  id: string;
  userId: string;
  name: string;
  items: WebGroceryItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface WebChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

