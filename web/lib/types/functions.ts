// Type definitions for SAVR
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: SubscriptionTierName;
  subscriptionStatus?: 'active' | 'trialing' | 'cancelled' | 'past_due' | 'pending' | 'paused';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeEmail?: string;
  stripeName?: string;
  paypalSubscriptionId?: string;
  trialEndsAt?: Date;
  trialEndingNotified?: boolean;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  lastPaymentDate?: Date;
  lastPaymentStatus?: 'succeeded' | 'failed';
  lastPaymentAmount?: number;
  lastPaymentCurrency?: string;
  lastPaymentFailedAt?: Date;
  lastInvoiceId?: string;
  paymentActionRequired?: boolean;
  dataConsentGranted?: boolean;
  dataConsentDate?: Date;
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
  nutrition?: NutritionalInfo;
  generatedBy: 'ai' | 'user' | 'import';
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
    nutrition?: NutritionalInfo;
  }>;
  dailyNutritionSummary?: Array<{
    day: number;
    totals: NutritionalInfo;
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
  nutrition?: NutritionalInfo;
}

export interface AiMeal {
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeName: string;
  ingredients: string[];
  nutrition?: NutritionalInfo;
}

export interface AiMealPlan {
  name: string;
  meals: AiMeal[];
  dailyNutritionSummary?: Array<{
    day: number;
    totals: NutritionalInfo;
  }>;
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
    currentRecipe?: Recipe;
  };
}

export interface ChatResponse {
  success: boolean;
  response: string;
}

// Recipe import (URL, photo, PDF)
export interface ImportRecipeRequest {
  url?: string;
  imageUrl?: string;
  pdfText?: string;
}

export interface ImportRecipeResponse {
  success: boolean;
  recipeId: string;
  recipe: AiRecipe;
}

// Ingredient substitution
export interface SubstitutionRequest {
  ingredientName: string;
  ingredientQuantity: number;
  ingredientUnit: string;
  recipeTitle: string;
  recipeIngredients: Array<{ name: string; quantity: number; unit: string }>;
  recipeInstructions: string[];
  inventoryItems: Array<{ name: string; quantity: number; unit: string }>;
}

export interface SubstitutionOption {
  name: string;
  quantity: number;
  unit: string;
  inInventory: boolean;
  impactNotes: string;
}

export interface SubstitutionResponse {
  success: boolean;
  originalIngredient: string;
  substitutions: SubstitutionOption[];
}

// Inventory deduction after cooking
export interface DeductInventoryRequest {
  recipeId: string;
  deductions: Array<{
    inventoryItemId: string;
    quantityUsed: number;
    unit: string;
  }>;
  servingsCooked?: number;
}

export interface DeductInventoryResponse {
  success: boolean;
  updatedItems: Array<{ id: string; newQuantity: number }>;
  depletedItems: string[]; // IDs of items that reached 0
}

// Receipt scanning
export interface ExtractReceiptRequest {
  imageUrl: string;
}

export interface ExtractReceiptResponse {
  success: boolean;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    price?: number;
  }>;
}

// Transfer session for QR photo transfer
export interface TransferSession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  imageUrls: string[];
  status: 'active' | 'completed' | 'expired';
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

// Cooking session (tracks active cooking state)
export interface CookingSession {
  recipeId: string;
  userId: string;
  currentStep: number;
  startedAt: Date;
  timers: Array<{
    stepIndex: number;
    durationSeconds: number;
    label: string;
    startedAt?: Date;
  }>;
}

export type SubscriptionTierName = 'basic' | 'pro';

export interface SubscriptionTier {
  name: SubscriptionTierName;
  maxInventoryItems: number;
  maxRecipesPerMonth: number;
  maxMealPlansPerMonth: number;
  maxPetRecipesPerMonth: number;
  aiChatEnabled: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTierName, SubscriptionTier> = {
  basic: {
    name: 'basic',
    maxInventoryItems: 50,
    maxRecipesPerMonth: 10,
    maxMealPlansPerMonth: 2,
    maxPetRecipesPerMonth: 5,
    aiChatEnabled: false,
  },
  pro: {
    name: 'pro',
    maxInventoryItems: -1,
    maxRecipesPerMonth: -1,
    maxMealPlansPerMonth: -1,
    maxPetRecipesPerMonth: -1,
    aiChatEnabled: true,
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
  attributes?: Record<string, unknown>; // key-value map for extra info (e.g., {"brand": "Heinz", "isTransparent": true})
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
  createdAt: Date | string; // ISO date string or Date object
  updatedAt: Date | string; // ISO date string or Date object
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
  createdAt: Date | string; // ISO date string or Date object
  updatedAt: Date | string; // ISO date string or Date object
  objects: AnnotationObject[];
}

export interface CategoryDocument {
  id: string; // stable categoryId used in annotations
  name: string; // human-readable label
  color?: string; // optional hex color for UI
  metadata?: Record<string, unknown>; // optional map (e.g., {"group": "container"})
}

// Request/Response types for labeling pipeline endpoints

export interface UploadImageRequest {
  file?: File | Buffer; // File object (for direct upload)
  imageUrl?: string; // URL of already uploaded image
  width: number; // Image width in pixels (required for accurate annotation coordinates)
  height: number; // Image height in pixels (required for accurate annotation coordinates)
  source?: ImageSource;
  videoId?: string;
  frameIndex?: number;
  autoLabel?: boolean; // Whether to automatically trigger AI segmentation (defaults to true)
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
  exportData?: CocoDataset | Record<string, unknown>; // COCO/YOLO format data
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
