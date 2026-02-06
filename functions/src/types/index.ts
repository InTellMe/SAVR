// Type definitions for SAVR
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: SubscriptionTierName;
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

export type RecipeType = 'human' | 'pet';
export type PetSpecies = 'cat' | 'dog';

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
  recipeType?: RecipeType;
  species?: PetSpecies;
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
  recipeType?: RecipeType;
  species?: PetSpecies;
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
  recipeType?: RecipeType;
  species?: PetSpecies;
  removedForSafety?: string[];
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
  name: SubscriptionTierName;
  maxInventoryItems: number;
  maxRecipesPerMonth: number;
  maxMealPlansPerMonth: number;
  maxPetRecipesPerMonth: number;
  aiChatEnabled: boolean;
  advancedFeatures: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTierName, SubscriptionTier> = {
  basic: {
    name: 'basic',
    maxInventoryItems: 50,
    maxRecipesPerMonth: 10,
    maxMealPlansPerMonth: 2,
    maxPetRecipesPerMonth: 5,
    aiChatEnabled: false,
    advancedFeatures: false,
  },
  plus: {
    name: 'plus',
    maxInventoryItems: -1,
    maxRecipesPerMonth: -1,
    maxMealPlansPerMonth: -1,
    maxPetRecipesPerMonth: -1,
    aiChatEnabled: true,
    advancedFeatures: true,
  },
  premium: {
    name: 'premium',
    maxInventoryItems: -1,
    maxRecipesPerMonth: -1,
    maxMealPlansPerMonth: -1,
    maxPetRecipesPerMonth: -1,
    aiChatEnabled: true,
    advancedFeatures: true,
  },
};

// Labeled training data rows for future ML pipelines
export interface LabeledDataRow {
  uid: string; // source user id (may be anonymized before export)
  imageRef: string; // storage path or gs:// URL for source image
  extractedItems: AiIngredient[]; // model output before user corrections
  correctedItems: AiIngredient[]; // user-corrected ground truth
  modelVersion: string; // e.g. 'vision-v1'
  source: 'inventory_ai' | 'recipe_ai' | 'other';
  createdAt: Date;
  usedForTraining?: boolean;
}

// Dataset Labeling Pipeline Types

export type ImageSource = 'photo' | 'video_frame';
export type LabelStatus = 'unlabeled' | 'ai_labeled' | 'in_review' | 'approved';
export type AnnotationSource = 'ai' | 'user';
export type AnnotationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface AnnotationObject {
  id: string; // object instance ID (for tracking/analytics or cross-frame tracking)
  categoryId: string; // ID of semantic class (e.g., "jar", "can", "box_cereal")
  attributes?: Record<string, any>; // key-value map for extra info (e.g., {"brand": "Heinz", "isTransparent": true})
  polygon: PolygonPoint[]; // array of {x, y} points normalized to [0, 1] or in pixel coordinates
  confidence?: number; // float 0-1 (for AI predictions)
  isOccluded?: boolean;
  isTruncated?: boolean;
}

export interface ImageDocument {
  id: string; // Firestore doc ID
  ownerUid: string; // user who uploaded
  source: ImageSource;
  videoId?: string; // reference to original video asset (for frames)
  frameIndex?: number; // frame number in video
  storagePathOriginal: string; // path/URL in object storage
  thumbnailPath?: string; // path to thumbnail version
  width: number;
  height: number;
  createdAt: Date | any; // Firestore Timestamp
  updatedAt: Date | any; // Firestore Timestamp
  labelStatus: LabelStatus;
  currentAnnotationId?: string; // reference to the latest accepted annotation set
}

export interface AnnotationDocument {
  id: string; // annotation ID
  imageId: string; // reference to images doc
  version: number; // integer version counter per image
  source: AnnotationSource;
  parentAnnotationId?: string; // previous annotation this was derived from
  status: AnnotationStatus;
  createdByUid: string; // annotator user ID (or system for AI)
  createdAt: Date | any; // Firestore Timestamp
  updatedAt: Date | any; // Firestore Timestamp
  objects: AnnotationObject[];
}

export interface CategoryDocument {
  id: string; // stable categoryId used in annotations
  name: string; // human-readable label
  color?: string; // optional hex color for UI
  metadata?: Record<string, any>; // optional map (e.g., {"group": "container"})
}

// Request/Response types for labeling pipeline endpoints

export interface UploadImageRequest {
  file?: any; // File object (for direct upload)
  imageUrl?: string; // URL of already uploaded image
  source?: ImageSource;
  videoId?: string;
  frameIndex?: number;
}

export interface UploadImageResponse {
  success: boolean;
  imageId: string;
  image: ImageDocument;
}

export interface GetImageAnnotationsRequest {
  imageId: string;
}

export interface GetImageAnnotationsResponse {
  success: boolean;
  image: ImageDocument;
  annotations: AnnotationDocument[];
  categories: CategoryDocument[];
}

export interface SaveAnnotationRequest {
  imageId: string;
  objects: AnnotationObject[];
  parentAnnotationId?: string;
  status?: AnnotationStatus;
}

export interface SaveAnnotationResponse {
  success: boolean;
  annotationId: string;
  annotation: AnnotationDocument;
}

export interface ExportDatasetRequest {
  labelStatus?: LabelStatus[];
  ownerUid?: string;
  startDate?: Date;
  endDate?: Date;
  format?: 'coco' | 'yolo' | 'custom';
}

export interface ExportDatasetResponse {
  success: boolean;
  exportUrl?: string;
  exportData?: any; // COCO/YOLO format data
  imageCount: number;
  annotationCount: number;
}

// COCO format types for export
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
  segmentation: number[][]; // flattened polygon coordinates [x1, y1, x2, y2, ...]
  area: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
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
