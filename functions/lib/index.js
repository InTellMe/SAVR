"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = exports.createStripePortal = exports.stripeWebhook = exports.createStripeCheckout = exports.chat = exports.createGroceryList = exports.createMealPlan = exports.createRecipe = exports.analyzeImage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firebase_1 = require("./utils/firebase");
const ai_1 = require("./services/ai");
const stripe_1 = require("./services/stripe");
const subscription_1 = require("./utils/subscription");
// Image Analysis Function
exports.analyzeImage = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageUrl } = data;
    const userId = context.auth.uid;
    // Check usage limits
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'inventory');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }
    try {
        const ingredients = await (0, ai_1.extractIngredientsFromImage)(imageUrl);
        return { success: true, ingredients };
    }
    catch (error) {
        console.error('Image analysis error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to analyze image');
    }
});
// Recipe Generation Function
exports.createRecipe = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { ingredients, preferences } = data;
    const userId = context.auth.uid;
    // Check usage limits
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'recipes');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }
    try {
        const recipe = await (0, ai_1.generateRecipe)(ingredients, preferences);
        // Save recipe to Firestore
        const recipeRef = await firebase_1.db
            .collection('recipes')
            .doc(userId)
            .collection('items')
            .add({
            ...recipe,
            userId,
            generatedBy: 'ai',
            createdAt: new Date(),
        });
        return { success: true, recipeId: recipeRef.id, recipe };
    }
    catch (error) {
        console.error('Recipe generation error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate recipe');
    }
});
// Meal Plan Generation Function
exports.createMealPlan = functions
    .runWith({ timeoutSeconds: 180, memory: '512MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { days, ingredients, preferences } = data;
    const userId = context.auth.uid;
    // Check usage limits
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'mealPlans');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }
    try {
        const mealPlan = await (0, ai_1.generateMealPlan)(days, ingredients, preferences);
        // Save meal plan to Firestore
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        const mealPlanRef = await firebase_1.db
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
        return { success: true, mealPlanId: mealPlanRef.id, mealPlan };
    }
    catch (error) {
        console.error('Meal plan generation error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate meal plan');
    }
});
// Grocery List Generation Function
exports.createGroceryList = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { recipeIds } = data;
    const userId = context.auth.uid;
    try {
        // Fetch recipes
        const recipes = await Promise.all(recipeIds.map(async (id) => {
            const doc = await firebase_1.db
                .collection('recipes')
                .doc(userId)
                .collection('items')
                .doc(id)
                .get();
            return doc.data();
        }));
        // Fetch current inventory
        const inventorySnapshot = await firebase_1.db
            .collection('inventory')
            .doc(userId)
            .collection('items')
            .get();
        const currentInventory = inventorySnapshot.docs.map(doc => doc.data().name);
        const groceryItems = await (0, ai_1.generateGroceryList)(recipes, currentInventory);
        // Save grocery list to Firestore
        const listRef = await firebase_1.db
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
        return { success: true, listId: listRef.id, items: groceryItems };
    }
    catch (error) {
        console.error('Grocery list generation error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate grocery list');
    }
});
// Chat Assistant Function
exports.chat = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { message, conversationHistory, contextData } = data;
    const userId = context.auth.uid;
    // Check usage limits (Pro only feature)
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'aiChat');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('permission-denied', usageCheck.reason || 'Feature not available');
    }
    try {
        const response = await (0, ai_1.chatAssistant)(message, conversationHistory || [], contextData);
        // Save chat message to Firestore
        await firebase_1.db
            .collection('chatHistory')
            .doc(userId)
            .collection('messages')
            .add({
            userId,
            role: 'user',
            content: message,
            timestamp: new Date(),
        });
        await firebase_1.db
            .collection('chatHistory')
            .doc(userId)
            .collection('messages')
            .add({
            userId,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
        });
        return { success: true, response };
    }
    catch (error) {
        console.error('Chat error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to process chat');
    }
});
// Stripe Checkout Session Creation
exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { priceId, successUrl, cancelUrl } = data;
    const userId = context.auth.uid;
    try {
        const sessionUrl = await (0, stripe_1.createCheckoutSession)(userId, priceId, successUrl, cancelUrl);
        return { success: true, url: sessionUrl };
    }
    catch (error) {
        console.error('Stripe checkout error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to create checkout session');
    }
});
// Stripe Webhook Handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).send('No signature');
        return;
    }
    try {
        await (0, stripe_1.handleStripeWebhook)(req.rawBody.toString(), signature);
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
// Stripe Customer Portal Session
exports.createStripePortal = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { returnUrl } = data;
    const userId = context.auth.uid;
    try {
        const portalUrl = await (0, stripe_1.createPortalSession)(userId, returnUrl);
        return { success: true, url: portalUrl };
    }
    catch (error) {
        console.error('Portal creation error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to create portal session');
    }
});
// User initialization function (triggered on user creation)
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    await firebase_1.db.collection('users').doc(user.uid).set({
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
//# sourceMappingURL=index.js.map