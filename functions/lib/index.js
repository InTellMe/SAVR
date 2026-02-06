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
exports.exportDataset = exports.triggerSegmentation = exports.saveAnnotation = exports.getImageAnnotations = exports.uploadLabelingImage = exports.onUserCreate = exports.createStripePortal = exports.stripeWebhook = exports.createStripeCheckout = exports.chat = exports.createGroceryList = exports.createMealPlan = exports.createRecipe = exports.analyzeImage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firebase_1 = require("./utils/firebase");
const ai_1 = require("./services/ai");
const stripe_1 = require("./services/stripe");
const subscription_1 = require("./utils/subscription");
const rateLimit_1 = require("./utils/rateLimit");
const datasetStorage_1 = require("./utils/datasetStorage");
const segmentation_1 = require("./services/segmentation");
const datasetExport_1 = require("./utils/datasetExport");
// Image Analysis Function
exports.analyzeImage = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageUrl } = data;
    if (!imageUrl || typeof imageUrl !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required and must be a string');
    }
    const userId = context.auth.uid;
    const rateCheck = await (0, rateLimit_1.checkAndIncrement)(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }
    // Check usage limits
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'inventory');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }
    try {
        const ingredients = await (0, ai_1.extractIngredientsFromImage)(imageUrl);
        const response = { success: true, ingredients };
        return response;
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
    const { ingredients, preferences, recipeType, species } = data;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'ingredients must be a non-empty string array');
    }
    const userId = context.auth.uid;
    const mode = recipeType === 'pet' ? 'pet' : 'human';
    const petSpecies = species ?? 'dog';
    const rateCheck = await (0, rateLimit_1.checkAndIncrement)(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }
    // Check general recipe usage limits
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'recipes');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', usageCheck.reason || 'Limit reached');
    }
    if (mode === 'pet') {
        const petCheck = await (0, subscription_1.checkUsageLimit)(userId, 'petRecipes');
        if (!petCheck.allowed) {
            throw new functions.https.HttpsError('resource-exhausted', petCheck.reason || 'Pet recipe limit reached');
        }
    }
    try {
        const { recipe, removedForSafety } = await (0, ai_1.generateRecipe)(ingredients, preferences, {
            mode,
            species: petSpecies,
        });
        // Save recipe to Firestore
        const recipeRef = await firebase_1.db
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
        const response = {
            success: true,
            recipeId: recipeRef.id,
            recipe,
            recipeType: mode,
            species: mode === 'pet' ? petSpecies : undefined,
            removedForSafety: removedForSafety.length > 0 ? removedForSafety : undefined,
        };
        return response;
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
    if (typeof days !== 'number' || days < 1 || days > 14) {
        throw new functions.https.HttpsError('invalid-argument', 'days must be a number between 1 and 14');
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'ingredients must be a non-empty string array');
    }
    const userId = context.auth.uid;
    const rateCheck = await (0, rateLimit_1.checkAndIncrement)(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }
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
        const response = {
            success: true,
            mealPlanId: mealPlanRef.id,
            mealPlan,
        };
        return response;
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
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'recipeIds must be a non-empty string array');
    }
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
        const response = {
            success: true,
            listId: listRef.id,
            items: groceryItems,
        };
        return response;
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
    if (!message || typeof message !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'message is required and must be a string');
    }
    const userId = context.auth.uid;
    const rateCheck = await (0, rateLimit_1.checkAndIncrement)(userId, 'global', 100, 60_000);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', rateCheck.reason || 'Rate limit exceeded');
    }
    // Check usage limits (Pro only feature)
    const usageCheck = await (0, subscription_1.checkUsageLimit)(userId, 'aiChat');
    if (!usageCheck.allowed) {
        throw new functions.https.HttpsError('permission-denied', usageCheck.reason || 'Feature not available');
    }
    try {
        const responseText = await (0, ai_1.chatAssistant)(message, conversationHistory || [], contextData);
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
            content: responseText,
            timestamp: new Date(),
        });
        const response = { success: true, response: responseText };
        return response;
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
exports.uploadLabelingImage = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageUrl, source, videoId, frameIndex } = data;
    if (!imageUrl || typeof imageUrl !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required and must be a string');
    }
    const userId = context.auth.uid;
    try {
        // For now, we assume imageUrl is already uploaded and we just need to create the document
        // In production, you might want to handle file upload here
        // Extract image dimensions (would need to fetch image or pass as params)
        const imageId = firebase_1.db.collection('images').doc().id;
        // Default dimensions - in production, fetch actual dimensions from image
        const width = data.width || 1920;
        const height = data.height || 1080;
        const imageDoc = await (0, datasetStorage_1.createImageDocument)(userId, imageId, imageUrl, width, height, source || 'photo', videoId, frameIndex);
        // Optionally trigger AI inference automatically
        if (data.autoLabel !== false) {
            // Trigger inference asynchronously
            triggerSegmentationInference(imageId, imageUrl, width, height).catch(err => {
                console.error('Failed to trigger segmentation inference:', err);
            });
        }
        const response = {
            success: true,
            imageId,
            image: imageDoc,
        };
        return response;
    }
    catch (error) {
        console.error('Image upload error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to upload image');
    }
});
/**
 * Get image annotations
 */
exports.getImageAnnotations = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageId } = data;
    if (!imageId || typeof imageId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'imageId is required and must be a string');
    }
    const userId = context.auth.uid;
    try {
        const image = await (0, datasetStorage_1.getImageDocument)(imageId);
        if (!image) {
            throw new functions.https.HttpsError('not-found', 'Image not found');
        }
        // Check ownership
        if (image.ownerUid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const annotations = await (0, datasetStorage_1.getImageAnnotations)(imageId);
        const categories = await (0, datasetStorage_1.getAllCategories)();
        const response = {
            success: true,
            image,
            annotations,
            categories,
        };
        return response;
    }
    catch (error) {
        console.error('Get annotations error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Failed to get annotations');
    }
});
/**
 * Save annotation (user corrections)
 */
exports.saveAnnotation = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageId, objects, parentAnnotationId, status } = data;
    if (!imageId || typeof imageId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'imageId is required and must be a string');
    }
    if (!Array.isArray(objects)) {
        throw new functions.https.HttpsError('invalid-argument', 'objects must be an array');
    }
    const userId = context.auth.uid;
    try {
        const image = await (0, datasetStorage_1.getImageDocument)(imageId);
        if (!image) {
            throw new functions.https.HttpsError('not-found', 'Image not found');
        }
        // Check ownership
        if (image.ownerUid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const annotation = await (0, datasetStorage_1.createAnnotationDocument)(imageId, userId, objects, 'user', parentAnnotationId, status || 'submitted');
        // Update image status
        await (0, datasetStorage_1.updateImageLabelStatus)(imageId, status === 'approved' ? 'approved' : 'in_review', annotation.id);
        const response = {
            success: true,
            annotationId: annotation.id,
            annotation,
        };
        return response;
    }
    catch (error) {
        console.error('Save annotation error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Failed to save annotation');
    }
});
/**
 * Trigger segmentation inference (can be called manually or automatically)
 */
exports.triggerSegmentation = functions
    .runWith({ timeoutSeconds: 300, memory: '1GB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { imageId } = data;
    if (!imageId || typeof imageId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'imageId is required and must be a string');
    }
    const userId = context.auth.uid;
    try {
        const image = await (0, datasetStorage_1.getImageDocument)(imageId);
        if (!image) {
            throw new functions.https.HttpsError('not-found', 'Image not found');
        }
        if (image.ownerUid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        // Get signed URL for image
        const imageUrl = await (0, datasetStorage_1.getImageSignedUrl)(image.storagePathOriginal);
        // Run segmentation
        const objects = await (0, segmentation_1.runSegmentationInference)(imageUrl, image.width, image.height);
        // Create AI annotation
        const annotation = await (0, datasetStorage_1.createAnnotationDocument)(imageId, 'system', objects, 'ai', undefined, 'draft');
        // Update image status
        await (0, datasetStorage_1.updateImageLabelStatus)(imageId, 'ai_labeled', annotation.id);
        return {
            success: true,
            annotationId: annotation.id,
            objectCount: objects.length,
        };
    }
    catch (error) {
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
async function triggerSegmentationInference(imageId, imageUrl, width, height) {
    try {
        const objects = await (0, segmentation_1.runSegmentationInference)(imageUrl, width, height);
        const annotation = await (0, datasetStorage_1.createAnnotationDocument)(imageId, 'system', objects, 'ai', undefined, 'draft');
        await (0, datasetStorage_1.updateImageLabelStatus)(imageId, 'ai_labeled', annotation.id);
    }
    catch (error) {
        console.error('Async segmentation failed:', error);
        throw error;
    }
}
/**
 * Export dataset for training
 */
exports.exportDataset = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { labelStatus, ownerUid, startDate, endDate } = data;
    const userId = context.auth.uid;
    // Only allow users to export their own data (unless admin)
    const filterUid = ownerUid || userId;
    if (filterUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Can only export your own data');
    }
    try {
        const exportData = await (0, datasetExport_1.exportToCocoFormat)({
            labelStatus: labelStatus || ['approved'],
            ownerUid: filterUid,
            startDate,
            endDate,
        });
        const response = {
            success: true,
            exportData,
            imageCount: exportData.images.length,
            annotationCount: exportData.annotations.length,
        };
        return response;
    }
    catch (error) {
        console.error('Export dataset error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to export dataset');
    }
});
//# sourceMappingURL=index.js.map