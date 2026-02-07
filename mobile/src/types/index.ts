export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export type SubscriptionTierName = 'basic' | 'pro';

export interface UserData {
  uid: string;
  email: string | null;
  displayName?: string | null;
  subscriptionTier: SubscriptionTierName | 'free' | 'plus' | 'premium'; // legacy support
  subscriptionStatus?: string;
  createdAt?: any;
}

export function isPaidTier(tier: UserData['subscriptionTier'] | undefined): boolean {
  // All tiers are now paid (basic and pro)
  return tier === 'basic' || tier === 'pro' || tier === 'plus' || tier === 'premium' || tier === 'free';
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  imageUrl?: string;
  addedAt: any;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[] | string[];
  instructions: string[];
  prepTime?: number;
  cookTime: number;
  servings: number;
  difficulty?: string;
  cuisine?: string;
  dietaryTags?: string[];
  recipeType?: 'human' | 'pet';
  species?: 'cat' | 'dog';
  imageUrl?: string;
  createdAt: any;
}

export interface MealPlan {
  id: string;
  date: string;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
  };
  createdAt: any;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category: string;
}

export interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: any;
}
