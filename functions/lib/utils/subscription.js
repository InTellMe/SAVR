"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSubscriptionTier = getUserSubscriptionTier;
exports.checkUsageLimit = checkUsageLimit;
const firebase_1 = require("../utils/firebase");
const types_1 = require("../types");
async function getUserSubscriptionTier(userId) {
    const userDoc = await firebase_1.db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.subscriptionTier || 'free';
}
async function checkUsageLimit(userId, resource) {
    const tier = await getUserSubscriptionTier(userId);
    const limits = types_1.TIER_LIMITS[tier];
    if (resource === 'aiChat' && !limits.aiChatEnabled) {
        return {
            allowed: false,
            reason: 'AI chat is only available for Pro subscribers',
        };
    }
    // Check inventory limit
    if (resource === 'inventory' && limits.maxInventoryItems !== -1) {
        const inventorySnapshot = await firebase_1.db
            .collection('inventory')
            .doc(userId)
            .collection('items')
            .get();
        if (inventorySnapshot.size >= limits.maxInventoryItems) {
            return {
                allowed: false,
                reason: `Inventory limit reached. Upgrade to Pro for unlimited items.`,
            };
        }
    }
    // Check monthly recipe generation limit
    if (resource === 'recipes' && limits.maxRecipesPerMonth !== -1) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const recipesSnapshot = await firebase_1.db
            .collection('recipes')
            .doc(userId)
            .collection('items')
            .where('generatedBy', '==', 'ai')
            .where('createdAt', '>=', startOfMonth)
            .get();
        if (recipesSnapshot.size >= limits.maxRecipesPerMonth) {
            return {
                allowed: false,
                reason: `Monthly recipe generation limit reached. Upgrade to Pro for unlimited recipes.`,
            };
        }
    }
    // Check monthly meal plan limit
    if (resource === 'mealPlans' && limits.maxMealPlansPerMonth !== -1) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const mealPlansSnapshot = await firebase_1.db
            .collection('mealPlans')
            .doc(userId)
            .collection('plans')
            .where('createdAt', '>=', startOfMonth)
            .get();
        if (mealPlansSnapshot.size >= limits.maxMealPlansPerMonth) {
            return {
                allowed: false,
                reason: `Monthly meal plan limit reached. Upgrade to Pro for unlimited meal plans.`,
            };
        }
    }
    return { allowed: true };
}
//# sourceMappingURL=subscription.js.map