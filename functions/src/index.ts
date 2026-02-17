import * as functionsV1 from 'firebase-functions/v1';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from './utils/firebase';
import {
  extractIngredientsFromImage,
  generateRecipe,
  generateMealPlan,
  generateGroceryList,
  chatAssistant,
  getSubstitutions,
  importRecipeFromUrl,
  importRecipeFromImage,
  importRecipeFromText,
  extractFromReceipt,
} from './services/ai';
import {
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
  CreateRecipeRequest,
  CreateRecipeResponse,
  CreateMealPlanRequest,
  CreateMealPlanResponse,
  CreateGroceryListRequest,
  CreateGroceryListResponse,
  DeductInventoryRequest,
  DeductInventoryResponse,
  ExtractReceiptRequest,
  ExtractReceiptResponse,
  ImportRecipeRequest,
  ImportRecipeResponse,
  Recipe,
  SubstitutionRequest,
  SubstitutionResponse,
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
import { exportToCocoFormat, exportToYoloFormat } from './utils/datasetExport';

// Image Analysis Function
export const analyzeImage = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
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



// Grocery List Generation Function
export const createGroceryList = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: ['OPENAI_API_KEY'],
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
    secrets: ['OPENAI_API_KEY'],
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



// Stripe Webhook Handler
export const stripeWebhook = onRequest(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    cors: false,
  },
  async (req, res) => {
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
  }
);

// Stripe Billing Portal — lets users manage subscription, change plan, update payment, cancel
export const createStripePortal = onCall(
  {
    secrets: ['STRIPE_SECRET_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { returnUrl } = request.data as { returnUrl?: string };
    const userId = request.auth.uid;

    try {
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appBaseUrl) {
        console.warn('NEXT_PUBLIC_APP_URL not set, using fallback URL for billing portal return');
      }
      const baseUrl = appBaseUrl || 'https://savr.cam';
      const resolvedReturnUrl = returnUrl || `${baseUrl}/settings`;
      const portalUrl = await createPortalSession(userId, resolvedReturnUrl);
      return { success: true, url: portalUrl };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing portal';
      console.error('Stripe portal error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Recipe Generation Function
export const createRecipe = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
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
    secrets: ['OPENAI_API_KEY'],
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

    const usageCheck = await checkUsageLimit(userId, 'mealPlans');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }

    try {
      const mealPlan = await generateMealPlan(days, ingredients, preferences);

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

// Dataset Labeling Pipeline Functions

// Upload image for labeling
export const uploadLabelingImage = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl, width, height, source, videoId, frameIndex, autoLabel } = request.data as UploadImageRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'imageUrl is required and must be a string'
      );
    }
    if (!width || typeof width !== 'number' || width <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'width is required and must be a positive number'
      );
    }
    if (!height || typeof height !== 'number' || height <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'height is required and must be a positive number'
      );
    }

    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    try {
      const imageId = db.collection('images').doc().id;

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
      if (autoLabel !== false) {
        // Convert gs:// URLs to signed URLs for OpenAI vision API
        let usableImageUrl = imageUrl;
        if (imageUrl.startsWith('gs://')) {
          const gsPath = imageUrl.replace(/^gs:\/\/[^/]+\//, '');
          usableImageUrl = await getImageSignedUrl(gsPath);
        }
        triggerSegmentationInference(imageId, usableImageUrl, width, height).catch(err => {
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

// Get image annotations
export const getImageAnnotations = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
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

      if (image.ownerUid !== userId) {
        throw new HttpsError('permission-denied', 'Access denied');
      }

      const annotations = await getImageAnnotationsFromStorage(imageId);
      const categories = await getAllCategories();

      // Provide a usable signed URL for the image if the stored path is a gs:// reference
      let resolvedImage = image;
      if (image.storagePathOriginal.startsWith('gs://')) {
        const gsPath = image.storagePathOriginal.replace(/^gs:\/\/[^/]+\//, '');
        const signedUrl = await getImageSignedUrl(gsPath);
        resolvedImage = { ...image, storagePathOriginal: signedUrl };
      }

      const response: GetImageAnnotationsResponse = {
        success: true,
        image: resolvedImage,
        annotations,
        categories,
      };
      return response;
    } catch (error: unknown) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to get annotations';
      console.error('Get annotations error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Save annotation (user corrections)
export const saveAnnotation = onCall(
  {
    cors: true,
  },
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

    // Validate polygon structure
    for (const obj of objects) {
      if (!obj.categoryId || typeof obj.categoryId !== 'string') {
        throw new HttpsError('invalid-argument', 'Each object must have a valid categoryId');
      }
      if (!Array.isArray(obj.polygon) || obj.polygon.length < 3) {
        throw new HttpsError('invalid-argument', 'Each object must have a polygon with at least 3 points');
      }
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
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to save annotation';
      console.error('Save annotation error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Trigger segmentation inference (can be called manually or automatically)
export const triggerSegmentation = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: ['OPENAI_API_KEY'],
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

      // Get a usable URL for the image
      let imageUrl: string;
      if (image.storagePathOriginal.startsWith('gs://')) {
        const gsPath = image.storagePathOriginal.replace(/^gs:\/\/[^/]+\//, '');
        imageUrl = await getImageSignedUrl(gsPath);
      } else {
        imageUrl = image.storagePathOriginal;
      }

      const objects = await runSegmentationInference(
        imageUrl,
        image.width,
        image.height
      );

      const annotation = await createAnnotationDocument(
        imageId,
        'system',
        objects,
        'ai',
        undefined,
        'draft'
      );

      await updateImageLabelStatus(imageId, 'ai_labeled', annotation.id);

      return {
        success: true,
        annotationId: annotation.id,
        objectCount: objects.length,
      };
    } catch (error: unknown) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to run segmentation';
      console.error('Segmentation inference error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Helper function to trigger segmentation asynchronously (used by uploadLabelingImage)
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

// Export dataset for training (supports COCO and YOLO formats)
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

    const { labelStatus, ownerUid, startDate, endDate, format } = request.data as ExportDatasetRequest;
    const userId = request.auth.uid;

    // Only allow users to export their own data
    const filterUid = ownerUid || userId;
    if (filterUid !== userId) {
      throw new HttpsError('permission-denied', 'Can only export your own data');
    }

    try {
      const filters = {
        labelStatus: labelStatus || ['approved'],
        ownerUid: filterUid,
        startDate,
        endDate,
      };

      let exportData: unknown;
      let imageCount = 0;
      let annotationCount = 0;

      if (format === 'yolo') {
        const yoloData = await exportToYoloFormat(filters);
        exportData = Object.fromEntries(yoloData);
        imageCount = yoloData.size;
        // Count annotation lines across all files
        for (const content of yoloData.values()) {
          annotationCount += content.split('\n').filter(Boolean).length;
        }
      } else {
        // Default to COCO format
        const cocoData = await exportToCocoFormat(filters);
        exportData = cocoData;
        imageCount = cocoData.images.length;
        annotationCount = cocoData.annotations.length;
      }

      const response: ExportDatasetResponse = {
        success: true,
        exportData: exportData as ExportDatasetResponse['exportData'],
        imageCount,
        annotationCount,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export dataset';
      console.error('Export dataset error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// User Creation Trigger (v1 API - auth triggers not yet available in v2)
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
    const userId = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || '';

    try {
      // Create user document in Firestore
      await db.collection('users').doc(userId).set({
        uid: userId,
        email,
        displayName,
        subscriptionTier: 'basic',
        subscriptionStatus: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`User document created for ${userId}`);
    } catch (error) {
      console.error('Error creating user document:', error);
      // Don't throw error to avoid blocking user creation
    }
  });

// Ingredient Substitution Function
export const getSubstitution = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const data = request.data as SubstitutionRequest;
    if (!data.ingredientName || !data.recipeTitle) {
      throw new HttpsError('invalid-argument', 'ingredientName and recipeTitle are required');
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    try {
      const substitutions = await getSubstitutions(
        data.ingredientName,
        data.ingredientQuantity,
        data.ingredientUnit,
        data.recipeTitle,
        data.recipeIngredients,
        data.recipeInstructions,
        data.inventoryItems
      );

      const response: SubstitutionResponse = {
        success: true,
        originalIngredient: data.ingredientName,
        substitutions,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get substitutions';
      console.error('Substitution error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Recipe Import Function (URL, image, or PDF text)
export const importRecipe = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { url, imageUrl, pdfText } = request.data as ImportRecipeRequest;
    if (!url && !imageUrl && !pdfText) {
      throw new HttpsError('invalid-argument', 'One of url, imageUrl, or pdfText is required');
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    const usageCheck = await checkUsageLimit(userId, 'recipes');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Recipe limit reached');
    }

    try {
      let recipe;
      if (url) {
        recipe = await importRecipeFromUrl(url);
      } else if (imageUrl) {
        recipe = await importRecipeFromImage(imageUrl);
      } else if (pdfText) {
        recipe = await importRecipeFromText(pdfText);
      } else {
        throw new Error('No import source provided');
      }

      // Save to Firestore
      const recipeRef = await db
        .collection('recipes')
        .doc(userId)
        .collection('items')
        .add({
          ...recipe,
          userId,
          generatedBy: 'import',
          recipeType: 'human',
          createdAt: new Date(),
        });

      const response: ImportRecipeResponse = {
        success: true,
        recipeId: recipeRef.id,
        recipe,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import recipe';
      console.error('Recipe import error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Inventory Deduction Function ("I Made This")
export const deductInventory = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { deductions } = request.data as DeductInventoryRequest;
    if (!Array.isArray(deductions) || deductions.length === 0) {
      throw new HttpsError('invalid-argument', 'deductions must be a non-empty array');
    }
    const userId = request.auth.uid;

    try {
      const updatedItems: Array<{ id: string; newQuantity: number }> = [];
      const depletedItems: string[] = [];
      const batch = db.batch();

      for (const deduction of deductions) {
        const itemRef = db
          .collection('inventory')
          .doc(userId)
          .collection('items')
          .doc(deduction.inventoryItemId);

        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) continue;

        const currentData = itemDoc.data();
        if (!currentData) continue;

        const newQuantity = Math.max(0, currentData.quantity - deduction.quantityUsed);
        updatedItems.push({ id: deduction.inventoryItemId, newQuantity });

        if (newQuantity <= 0) {
          depletedItems.push(deduction.inventoryItemId);
          batch.delete(itemRef);
        } else {
          batch.update(itemRef, { quantity: newQuantity });
        }
      }

      await batch.commit();

      const response: DeductInventoryResponse = {
        success: true,
        updatedItems,
        depletedItems,
      };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deduct inventory';
      console.error('Inventory deduction error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Receipt Scanning Function
export const scanReceipt = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { imageUrl } = request.data as ExtractReceiptRequest;
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'imageUrl is required');
    }
    const userId = request.auth.uid;

    const rateCheck = await checkAndIncrement(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }

    const usageCheck = await checkUsageLimit(userId, 'inventory');
    if (!usageCheck.allowed) {
      throw new HttpsError('resource-exhausted', usageCheck.reason || 'Inventory limit reached');
    }

    try {
      const items = await extractFromReceipt(imageUrl);
      const response: ExtractReceiptResponse = { success: true, items };
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan receipt';
      console.error('Receipt scan error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);

// Create Transfer Session for QR code photo transfer
export const createTransferSession = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const sessionRef = await db.collection('transferSessions').add({
        userId,
        createdAt: new Date(),
        expiresAt,
        imageUrls: [],
        status: 'active',
      });

      return { success: true, sessionId: sessionRef.id, expiresAt: expiresAt.toISOString() };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transfer session';
      console.error('Transfer session error:', error);
      throw new HttpsError('internal', errorMessage);
    }
  }
);




