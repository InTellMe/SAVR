import * as functionsV1 from 'firebase-functions/v1';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, admin } from './utils/firebase';
import {
  extractIngredientsFromImage,
  generateGroceryList,
  chatAssistant,
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
  CreateGroceryListRequest,
  CreateGroceryListResponse,
  Recipe,
} from './types';

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
      const resolvedReturnUrl = returnUrl || `${appBaseUrl || 'https://www.SAVR.cam'}/settings`;
      const portalUrl = await createPortalSession(userId, resolvedReturnUrl);
      return { success: true, url: portalUrl };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing portal';
      console.error('Stripe portal error:', error);
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




