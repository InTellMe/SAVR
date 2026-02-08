import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { db } from './utils/firebase';
import {
  extractIngredientsFromImage,
  generateRecipe,
  generateMealPlan,
  generateGroceryList,
  chatAssistant,
} from './services/ai';
import {
  createCheckoutSession,
  handleStripeWebhook,
  createPortalSession,
} from './services/stripe';
import { checkUsageLimit } from './utils/subscription';
import { checkAndIncrement } from './utils/rateLimit';
import {
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  ChatRequest,
  ChatResponse,
  CreateGroceryListRequest,
  CreateGroceryListResponse,
  CreateMealPlanRequest,
  CreateMealPlanResponse,
  CreateRecipeRequest,
  CreateRecipeResponse,
  UploadImageRequest,
  UploadImageResponse,
  GetImageAnnotationsRequest,
  GetImageAnnotationsResponse,
  SaveAnnotationRequest,
  SaveAnnotationResponse,
  ExportDatasetRequest,
  ExportDatasetResponse,
  Recipe,
} from './types';
import {
  createImageDocument,
  getImageDocument,
  updateImageLabelStatus,
  createAnnotationDocument,
  getImageAnnotations as getImageAnnotationsFromStorage,
  getAllCategories,
  getImageSignedUrl,
} from './utils/datasetStorage';
import { runSegmentationInference } from './services/segmentation';
import { exportToCocoFormat } from './utils/datasetExport';

// Image Analysis Function
export const analyzeImage = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    cors: true,
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl } = request.data as AnalyzeImageRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageUrl is required and must be a string'
      );
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'inventory');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    try {
      const ingredients = await extractIngredientsFromImage(imageUrl);
      const response: AnalyzeImageResponse = { success: true, ingredients };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      console.error('Image analysis error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Recipe Generation Function
export const createRecipe = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { ingredients, preferences, recipeType, species } = request.data as CreateRecipeRequest;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'ingredients must be a non-empty string array'
      );
    }
    const userId = request.auth.uid;
    const mode = recipeType === 'pet' ? 'pet' : 'human';
    const petSpecies = species ?? 'dog';

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check general recipe usage limits
    const usageCheck = await checkUsageLimit(userId, 'recipes');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    if (mode === 'pet') {
      const petCheck = await checkUsageLimit(userId, 'petRecipes');
      if (!petCheck.allowed) {
        throw new HttpsError('resource-exhausted', petCheck.reason || 'Pet recipe limit reached');
      }
    }

    try {
      const { recipe, removedForSafety } = await generateRecipe(ingredients, preferences, {
        mode,
        species: petSpecies,
      });

      // Save recipe to Firestore
      const recipeRef = await db
        .collection('recipes')
        .doc(userId)
        .collection('items')
        .add({
          ...recipe,
          userId,
          generatedBy: 'ai',
          recipeType: mode,
          species: mode === 'pet' ? petSpecies : undefined,
          createdAt: new Date(),
        });

      const response: CreateRecipeResponse = {
        success: true,
        recipeId: recipeRef.id,
        recipe,
        recipeType: mode,
        species: mode === 'pet' ? petSpecies : undefined,
        removedForSafety: removedForSafety.length > 0 ? removedForSafety : undefined,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate recipe';
      console.error('Recipe generation error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Meal Plan Generation Function
export const createMealPlan = onCall(
  {
    timeoutSeconds: 180,
    memory: '512MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { days, ingredients, preferences } = request.data as CreateMealPlanRequest;
    if (typeof days !== 'number' || days < 1 || days > 14) {
      throw new HttpsError(
        'invalid-argument',
        'days must be a number between 1 and 14'
      );
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'ingredients must be a non-empty string array'
      );
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'mealPlans');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    try {
      const mealPlan = await generateMealPlan(days, ingredients, preferences);
      
      // Save meal plan to Firestore
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const mealPlanRef = await db
        .collection('mealPlans')
        .doc(userId)
        .collection('plans')
        .add({
          ...mealPlan,
          userId,
          startDate,
          endDate,
          createdAt: new Date(),
        });

      const response: CreateMealPlanResponse = {
        success: true,
        mealPlanId: mealPlanRef.id,
        mealPlan,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate meal plan';
      console.error('Meal plan generation error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Grocery List Generation Function
export const createGroceryList = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipeIds } = request.data as CreateGroceryListRequest;
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'recipeIds must be a non-empty string array'
      );
    }
    const userId = request.auth.uid;

    try {
      // Fetch recipes
      const recipes = await Promise.all(
        recipeIds.map(async (id: string) => {
          const doc = await db
            .collection('recipes')
            .doc(userId)
            .collection('items')
            .doc(id)
            .get();
          return doc.data();
        })
      );

      // Filter out undefined recipes and ensure proper typing
      // Note: Assumes Firestore data is already validated at write time via security rules
      const validRecipes = recipes.filter((r): r is Pick<Recipe, 'title' | 'ingredients'> => 
        r !== undefined && 
        'title' in r && 
        'ingredients' in r &&
        Array.isArray(r.ingredients)
      );

      // Fetch current inventory
      const inventorySnapshot = await db
        .collection('inventory')
        .doc(userId)
        .collection('items')
        .get();
      
      const currentInventory = inventorySnapshot.docs.map(doc => doc.data().name);

      const groceryItems = await generateGroceryList(validRecipes, currentInventory);
      
      // Save grocery list to Firestore
      const listRef = await db
        .collection('groceryLists')
        .doc(userId)
        .collection('lists')
        .add({
          name: `Grocery List ${new Date().toLocaleDateString()}`,
          userId,
          items: groceryItems.map(item => ({ ...item, checked: false })),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const response: CreateGroceryListResponse = {
        success: true,
        listId: listRef.id,
        items: groceryItems,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate grocery list';
      console.error('Grocery list generation error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Chat Assistant Function
export const chat = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { message, conversationHistory, contextData } = request.data as ChatRequest;
    if (!message || typeof message !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'message is required and must be a string'
      );
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits (Pro only feature)
    const usageCheck = await checkUsageLimit(userId, 'aiChat');
    if (!usageCheck.allowed) {
      throw new HttpsError('permission-denied', usageCheck.reason || 'Feature not available');
    }

    try {
      const responseText = await chatAssistant(
        message,
        conversationHistory || [],
        contextData
      );
      
      // Save chat message to Firestore
      await db
        .collection('chatHistory')
        .doc(userId)
        .collection('messages')
        .add({
          userId,
          role: 'user',
          content: message,
          timestamp: new Date(),
        });

      await db
        .collection('chatHistory')
        .doc(userId)
        .collection('messages')
        .add({
          userId,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        });

      const response: ChatResponse = { success: true, response: responseText };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process chat';
      console.error('Chat error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Stripe Checkout Session Creation (v2 with explicit CORS)
export const createStripeCheckout = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { priceId, successUrl, cancelUrl } = request.data as {
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    };
    const userId = request.auth.uid;

    try {
      const sessionUrl = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);
      return { success: true, url: sessionUrl };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      console.error('Stripe checkout error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Stripe Webhook Handler (v2 onRequest — no CORS needed, called server-to-server by Stripe)
export const stripeWebhook = onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).send('No signature');
    return;
  }

  try {
    await handleStripeWebhook(req.rawBody.toString(), signature);
    res.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Webhook error';
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${errorMessage}`);
  }
});

// Stripe Customer Portal Session (v2 with explicit CORS)
export const createStripePortal = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { returnUrl } = request.data as { returnUrl: string };
    const userId = request.auth.uid;

    try {
      const portalUrl = await createPortalSession(userId, returnUrl);
      return { success: true, url: portalUrl };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create portal session';
      console.error('Portal creation error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// User initialization function (triggered before user creation)
export const onUserCreate = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) {
    console.error('No user data in beforeUserCreated event');
    return;
  }
  
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    subscriptionTier: 'basic',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

// Dataset Labeling Pipeline Functions

/**
 * Upload image for labeling
 */
export const uploadLabelingImage = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl, source, videoId, frameIndex } = request.data as UploadImageRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageUrl is required and must be a string'
      );
    }

    const userId = request.auth.uid;

    try {
      // For now, we assume imageUrl is already uploaded and we just need to create the document
      // In production, you might want to handle file upload here
      // Extract image dimensions (would need to fetch image or pass as params)
      const imageId = db.collection('images').doc().id;
      
      // Default dimensions - in production, fetch actual dimensions from image
      const dataWithDefaults = request.data as UploadImageRequest & { width?: number; height?: number; autoLabel?: boolean };
      const width = dataWithDefaults.width || 1920;
      const height = dataWithDefaults.height || 1080;

      const imageDoc = await createImageDocument(
        userId,
        imageId,
        imageUrl,
        width,
        height,
        source || 'photo',
        videoId,
        frameIndex
      );

      // Optionally trigger AI inference automatically
      if (dataWithDefaults.autoLabel !== false) {
        // Trigger inference asynchronously
        triggerSegmentationInference(imageId, imageUrl, width, height).catch(err => {
          console.error('Failed to trigger segmentation inference:', err);
        });
      }

      const response: UploadImageResponse = {
        success: true,
        imageId,
        image: imageDoc,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      console.error('Image upload error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

/**
 * Get image annotations
 */
export const getImageAnnotations = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId } = request.data as GetImageAnnotationsRequest;
    if (!imageId || typeof imageId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }

    const userId = request.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new HttpsError('not-found', 'Image not found');
      }

      // Check ownership
      if (image.ownerUid !== userId) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      const annotations = await getImageAnnotationsFromStorage(imageId);
      const categories = await getAllCategories();

      const response: GetImageAnnotationsResponse = {
        success: true,
        image,
        annotations,
        categories,
      };
      return response;
    } catch (error: unknown) {
      console.error('Get annotations error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to get annotations';
      throw new HttpsError('internal', errorMessage);
    }
  }
);

/**
 * Save annotation (user corrections)
 */
export const saveAnnotation = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId, objects, parentAnnotationId, status } = request.data as SaveAnnotationRequest;
    if (!imageId || typeof imageId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }
    if (!Array.isArray(objects)) {
      throw new HttpsError(
        'invalid-argument',
        'objects must be an array'
      );
    }

    const userId = request.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new HttpsError('not-found', 'Image not found');
      }

      // Check ownership
      if (image.ownerUid !== userId) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      const annotation = await createAnnotationDocument(
        imageId,
        userId,
        objects,
        'user',
        parentAnnotationId,
        status || 'submitted'
      );

      // Update image status
      await updateImageLabelStatus(
        imageId,
        status === 'approved' ? 'approved' : 'in_review',
        annotation.id
      );

      const response: SaveAnnotationResponse = {
        success: true,
        annotationId: annotation.id,
        annotation,
      };
      return response;
    } catch (error: unknown) {
      console.error('Save annotation error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to save annotation';
      throw new HttpsError('internal', errorMessage);
    }
  }
);

/**
 * Trigger segmentation inference (can be called manually or automatically)
 */
export const triggerSegmentation = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId } = request.data as { imageId: string };
    if (!imageId || typeof imageId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }

    const userId = request.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new HttpsError('not-found', 'Image not found');
      }

      if (image.ownerUid !== userId) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      // Get signed URL for image
      const imageUrl = await getImageSignedUrl(image.storagePathOriginal);

      // Run segmentation
      const objects = await runSegmentationInference(
        imageUrl,
        image.width,
        image.height
      );

      // Create AI annotation
      const annotation = await createAnnotationDocument(
        imageId,
        'system',
        objects,
        'ai',
        undefined,
        'draft'
      );

      // Update image status
      await updateImageLabelStatus(imageId, 'ai_labeled', annotation.id);

      return {
        success: true,
        annotationId: annotation.id,
        objectCount: objects.length,
      };
    } catch (error: unknown) {
      console.error('Segmentation inference error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to run segmentation';
      throw new HttpsError('internal', errorMessage);
    }
  }
);

/**
 * Helper function to trigger segmentation asynchronously
 */
async function triggerSegmentationInference(
  imageId: string,
  imageUrl: string,
  width: number,
  height: number
): Promise<void> {
  try {
    const objects = await runSegmentationInference(imageUrl, width, height);
    const annotation = await createAnnotationDocument(
      imageId,
      'system',
      objects,
      'ai',
      undefined,
      'draft'
    );
    await updateImageLabelStatus(imageId, 'ai_labeled', annotation.id);
  } catch (error) {
    console.error('Async segmentation failed:', error);
    throw error;
  }
}

/**
 * Export dataset for training
 */
export const exportDataset = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { labelStatus, ownerUid, startDate, endDate } = request.data as ExportDatasetRequest;
    const userId = request.auth.uid;

    // Only allow users to export their own data (unless admin)
    const filterUid = ownerUid || userId;
    if (filterUid !== userId) {
      throw new HttpsError('permission-denied', 'Can only export your own data');
    }

    try {
      const exportData = await exportToCocoFormat({
        labelStatus: labelStatus || ['approved'],
        ownerUid: filterUid,
        startDate,
        endDate,
      });

      const response: ExportDatasetResponse = {
        success: true,
        exportData,
        imageCount: exportData.images.length,
        annotationCount: exportData.annotations.length,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export dataset';
      console.error('Export dataset error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);
