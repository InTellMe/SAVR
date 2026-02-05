import * as functions from 'firebase-functions/v1';
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
export const analyzeImage = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl } = data as AnalyzeImageRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageUrl is required and must be a string'
      );
    }
    const userId = context.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'inventory');
    if (!usageCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    try {
      const ingredients = await extractIngredientsFromImage(imageUrl);
      const response: AnalyzeImageResponse = { success: true, ingredients };
      return response;
    } catch (error: any) {
      console.error('Image analysis error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to analyze image');
    }
  });

// Recipe Generation Function
export const createRecipe = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { ingredients, preferences } = data as CreateRecipeRequest;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'ingredients must be a non-empty string array'
      );
    }
    const userId = context.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'recipes');
    if (!usageCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    try {
      const recipe = await generateRecipe(ingredients, preferences);
      
      // Save recipe to Firestore
      const recipeRef = await db
        .collection('recipes')
        .doc(userId)
        .collection('items')
        .add({
          ...recipe,
          userId,
          generatedBy: 'ai',
          createdAt: new Date(),
        });

      const response: CreateRecipeResponse = {
        success: true,
        recipeId: recipeRef.id,
        recipe,
      };
      return response;
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to generate recipe');
    }
  });

// Meal Plan Generation Function
export const createMealPlan = functions
  .runWith({ timeoutSeconds: 180, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { days, ingredients, preferences } = data as CreateMealPlanRequest;
    if (typeof days !== 'number' || days < 1 || days > 14) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'days must be a number between 1 and 14'
      );
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'ingredients must be a non-empty string array'
      );
    }
    const userId = context.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId, 'mealPlans');
    if (!usageCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
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
    } catch (error: any) {
      console.error('Meal plan generation error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to generate meal plan');
    }
  });

// Grocery List Generation Function
export const createGroceryList = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipeIds } = data as CreateGroceryListRequest;
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'recipeIds must be a non-empty string array'
      );
    }
    const userId = context.auth.uid;

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

      // Fetch current inventory
      const inventorySnapshot = await db
        .collection('inventory')
        .doc(userId)
        .collection('items')
        .get();
      
      const currentInventory = inventorySnapshot.docs.map(doc => doc.data().name);

      const groceryItems = await generateGroceryList(recipes, currentInventory);
      
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
    } catch (error: any) {
      console.error('Grocery list generation error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to generate grocery list');
    }
  });

// Chat Assistant Function
export const chat = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { message, conversationHistory, contextData } = data as ChatRequest;
    if (!message || typeof message !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'message is required and must be a string'
      );
    }
    const userId = context.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    // Check usage limits (Pro only feature)
    const usageCheck = await checkUsageLimit(userId, 'aiChat');
    if (!usageCheck.allowed) {
      throw new functions.https.HttpsError('permission-denied', usageCheck.reason || 'Feature not available');
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
    } catch (error: any) {
      console.error('Chat error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to process chat');
    }
  });

// Stripe Checkout Session Creation
export const createStripeCheckout = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { priceId, successUrl, cancelUrl } = data;
  const userId = context.auth.uid;

  try {
    const sessionUrl = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);
    return { success: true, url: sessionUrl };
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create checkout session');
  }
});

// Stripe Webhook Handler
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    res.status(400).send('No signature');
    return;
  }

  try {
    await handleStripeWebhook(req.rawBody.toString(), signature);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Stripe Customer Portal Session
export const createStripePortal = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { returnUrl } = data;
  const userId = context.auth.uid;

  try {
    const portalUrl = await createPortalSession(userId, returnUrl);
    return { success: true, url: portalUrl };
  } catch (error: any) {
    console.error('Portal creation error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create portal session');
  }
});

// User initialization function (triggered on user creation)
export const onUserCreate = functions.auth.user().onCreate(async (user: any) => {
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

// Dataset Labeling Pipeline Functions

/**
 * Upload image for labeling
 */
export const uploadLabelingImage = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl, source, videoId, frameIndex } = data as UploadImageRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageUrl is required and must be a string'
      );
    }

    const userId = context.auth.uid;

    try {
      // For now, we assume imageUrl is already uploaded and we just need to create the document
      // In production, you might want to handle file upload here
      // Extract image dimensions (would need to fetch image or pass as params)
      const imageId = db.collection('images').doc().id;
      
      // Default dimensions - in production, fetch actual dimensions from image
      const width = data.width || 1920;
      const height = data.height || 1080;

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
      if (data.autoLabel !== false) {
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
    } catch (error: any) {
      console.error('Image upload error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to upload image');
    }
  });

/**
 * Get image annotations
 */
export const getImageAnnotations = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId } = data as GetImageAnnotationsRequest;
    if (!imageId || typeof imageId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }

    const userId = context.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new functions.https.HttpsError('not-found', 'Image not found');
      }

      // Check ownership
      if (image.ownerUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
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
    } catch (error: any) {
      console.error('Get annotations error:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get annotations');
    }
  }
);

/**
 * Save annotation (user corrections)
 */
export const saveAnnotation = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId, objects, parentAnnotationId, status } = data as SaveAnnotationRequest;
    if (!imageId || typeof imageId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }
    if (!Array.isArray(objects)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'objects must be an array'
      );
    }

    const userId = context.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new functions.https.HttpsError('not-found', 'Image not found');
      }

      // Check ownership
      if (image.ownerUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
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
    } catch (error: any) {
      console.error('Save annotation error:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', error.message || 'Failed to save annotation');
    }
  }
);

/**
 * Trigger segmentation inference (can be called manually or automatically)
 */
export const triggerSegmentation = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageId } = data;
    if (!imageId || typeof imageId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'imageId is required and must be a string'
      );
    }

    const userId = context.auth.uid;

    try {
      const image = await getImageDocument(imageId);
      if (!image) {
        throw new functions.https.HttpsError('not-found', 'Image not found');
      }

      if (image.ownerUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
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
    } catch (error: any) {
      console.error('Segmentation inference error:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', error.message || 'Failed to run segmentation');
    }
  });

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
export const exportDataset = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { labelStatus, ownerUid, startDate, endDate, format } = data as ExportDatasetRequest;
    const userId = context.auth.uid;

    // Only allow users to export their own data (unless admin)
    const filterUid = ownerUid || userId;
    if (filterUid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Can only export your own data');
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
    } catch (error: any) {
      console.error('Export dataset error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to export dataset');
    }
  });
