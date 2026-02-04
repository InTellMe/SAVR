export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName?: string | null;
  subscriptionTier: 'free' | 'pro';
  subscriptionStatus?: string;
  createdAt?: any;
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

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: number;
  servings: number;
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
