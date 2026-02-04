"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSubscriptionTier = getUserSubscriptionTier;
exports.checkUsageLimit = checkUsageLimit;
exports.updateUserSubscription = updateUserSubscription;
exports.upsertUserSubscriptionRecord = upsertUserSubscriptionRecord;
const firebase_1 = require("../utils/firebase");
const types_1 = require("../types");
/**
 * Returns the effective subscription tier for a user, taking both
 * the stored tier and subscriptionStatus into account.
 *
 * - If the stored tier is 'pro' and status is explicitly set to a non-active
 *   state ('cancelled' or 'past_due'), the effective tier is downgraded to 'free'.
 * - If the status is undefined (e.g., legacy users), the stored tier is used as-is
 *   for backward compatibility.
 */
async function getUserSubscriptionTier(userId) {
    const userDoc = await firebase_1.db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const storedTier = userData?.subscriptionTier || 'free';
    const status = userData?.subscriptionStatus;
    // Only downgrade Pro users if their status is explicitly set to a non-active state
    // (e.g., 'cancelled' or 'past_due'). If status is undefined and tier is 'pro',
    // assume 'active' for backward compatibility with legacy users.
    if (storedTier === 'pro' && status !== undefined && status !== 'active') {
        return 'free';
    }
    return storedTier;
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
/**
 * Update subscription-related fields on the user document in a centralized way.
 * Fields omitted from the payload will be left unchanged.
 */
async function updateUserSubscription(userId, updates) {
    const updateData = {
        updatedAt: new Date(),
    };
    if (updates.subscriptionTier) {
        updateData.subscriptionTier = updates.subscriptionTier;
    }
    if (updates.subscriptionStatus) {
        updateData.subscriptionStatus = updates.subscriptionStatus;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'stripeCustomerId')) {
        updateData.stripeCustomerId = updates.stripeCustomerId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'paypalSubscriptionId')) {
        updateData.paypalSubscriptionId = updates.paypalSubscriptionId ?? null;
    }
    await firebase_1.db.collection('users').doc(userId).update(updateData);
}
/**
 * Upsert a per-user subscription record that tracks provider-specific identifiers
 * and the latest status timestamps.
 */
async function upsertUserSubscriptionRecord(userId, data) {
    const now = new Date();
    const payload = {
        userId,
        provider: data.provider,
        updatedAt: now,
    };
    if (data.status) {
        payload.status = data.status;
    }
    if (data.startDate) {
        payload.startDate = data.startDate;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'endDate')) {
        payload.endDate = data.endDate ?? null;
    }
    if (data.subscriptionId) {
        if (data.provider === 'stripe') {
            payload.stripeSubscriptionId = data.subscriptionId;
        }
        else if (data.provider === 'paypal') {
            payload.paypalSubscriptionId = data.subscriptionId;
        }
    }
    await firebase_1.db.collection('subscriptions').doc(userId).set(payload, { merge: true });
}
//# sourceMappingURL=subscription.js.map