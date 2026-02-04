import { db } from '../utils/firebase';
import { TIER_LIMITS } from '../types';

export async function getUserSubscriptionTier(userId: string): Promise<'free' | 'pro'> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  return userData?.subscriptionTier || 'free';
}

export async function checkUsageLimit(
  userId: string,
  resource: 'inventory' | 'recipes' | 'mealPlans' | 'aiChat'
): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserSubscriptionTier(userId);
  const limits = TIER_LIMITS[tier];

  if (resource === 'aiChat' && !limits.aiChatEnabled) {
    return {
      allowed: false,
      reason: 'AI chat is only available for Pro subscribers',
    };
  }

  // Check inventory limit
  if (resource === 'inventory' && limits.maxInventoryItems !== -1) {
    const inventorySnapshot = await db
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

    const recipesSnapshot = await db
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

    const mealPlansSnapshot = await db
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
