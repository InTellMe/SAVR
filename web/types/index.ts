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

// Nutritional information per serving
export interface NutritionalInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // milligrams
}

// Nutritional daily targets based on dietary preferences
export interface NutritionalTargets {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fat: { min: number; max: number };
  fiber?: { min: number };
  sodium?: { max: number };
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
  nutrition?: NutritionalInfo;
  generatedBy?: 'ai' | 'user' | 'import';
  recipeType?: 'human' | 'pet';
  species?: 'cat' | 'dog';
  createdAt?: string;
}

export interface WebMealPlanMeal {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  recipeName: string;
  nutrition?: NutritionalInfo;
}

export interface WebMealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: WebMealPlanMeal[];
  dailyNutritionSummary?: Array<{
    day: number;
    totals: NutritionalInfo;
  }>;
  createdAt?: string;
}

// Substitution types
export interface SubstitutionOption {
  name: string;
  quantity: number;
  unit: string;
  inInventory: boolean;
  impactNotes: string;
}

// Inventory deduction types
export interface DeductionItem {
  inventoryItemId: string;
  ingredientName: string;
  quantityUsed: number;
  unit: string;
  currentQuantity: number;
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

// Dataset Labeling Pipeline Types (Web)

export type WebImageSource = 'photo' | 'video_frame';
export type WebLabelStatus = 'unlabeled' | 'ai_labeled' | 'in_review' | 'approved';
export type WebAnnotationSource = 'ai' | 'user';
export type WebAnnotationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface WebPolygonPoint {
  x: number;
  y: number;
}

export interface WebAnnotationObject {
  id: string;
  categoryId: string;
  attributes?: Record<string, any>;
  polygon: WebPolygonPoint[];
  confidence?: number;
  isOccluded?: boolean;
  isTruncated?: boolean;
}

export interface WebImageDocument {
  id: string;
  ownerUid: string;
  source: WebImageSource;
  videoId?: string;
  frameIndex?: number;
  storagePathOriginal: string;
  thumbnailPath?: string;
  width: number;
  height: number;
  createdAt: any;
  updatedAt: any;
  labelStatus: WebLabelStatus;
  currentAnnotationId?: string;
}

export interface WebAnnotationDocument {
  id: string;
  imageId: string;
  version: number;
  source: WebAnnotationSource;
  parentAnnotationId?: string;
  status: WebAnnotationStatus;
  createdByUid: string;
  createdAt: any;
  updatedAt: any;
  objects: WebAnnotationObject[];
}

export interface WebCategoryDocument {
  id: string;
  name: string;
  color?: string;
  metadata?: Record<string, any>;
}

// COCO export format types
export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  segmentation: number[][];
  area: number;
  bbox: [number, number, number, number];
  iscrowd: 0 | 1;
}

export interface CocoCategory {
  id: number;
  name: string;
  supercategory?: string;
}

export interface CocoDataset {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

