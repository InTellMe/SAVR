import { db } from '../utils/firebase';
import { TIER_LIMITS, type SubscriptionTierName } from '../types';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

/**
 * Returns the effective subscription tier for a user, taking both
 * the stored tier and subscriptionStatus into account.
 * Legacy 'free'/'pro' are mapped to 'basic'/'plus'.
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTierName> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() as
    | {
        subscriptionTier?: SubscriptionTierName | 'free' | 'pro';
        subscriptionStatus?: SubscriptionStatus;
      }
    | undefined;

  let storedTier = userData?.subscriptionTier || 'basic';
  const status = userData?.subscriptionStatus;

  // Map legacy tiers
  if (storedTier === 'free') storedTier = 'basic';
  if (storedTier === 'pro') storedTier = 'plus';

  // Downgrade paid users if status is non-active
  if ((storedTier === 'plus' || storedTier === 'premium') && status !== undefined && status !== 'active') {
    return 'basic';
  }

  return storedTier as SubscriptionTierName;
}

export async function checkUsageLimit(
  userId: string,
  resource: 'inventory' | 'recipes' | 'mealPlans' | 'petRecipes' | 'aiChat'
): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserSubscriptionTier(userId);
  const limits = TIER_LIMITS[tier];

  if (resource === 'aiChat' && !limits.aiChatEnabled) {
    return {
      allowed: false,
      reason: 'AI chat is available on Plus and Premium. Upgrade to unlock.',
    };
  }

  // Check monthly pet recipe limit (Basic/free tier)
  if (resource === 'petRecipes' && limits.maxPetRecipesPerMonth !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const petRecipesSnapshot = await db
      .collection('recipes')
      .doc(userId)
      .collection('items')
      .where('generatedBy', '==', 'ai')
      .where('recipeType', '==', 'pet')
      .where('createdAt', '>=', startOfMonth)
      .get();

    if (petRecipesSnapshot.size >= limits.maxPetRecipesPerMonth) {
      return {
        allowed: false,
        reason: `Monthly pet recipe limit reached (${limits.maxPetRecipesPerMonth}). Upgrade to Plus or Premium for unlimited pet recipes.`,
      };
    }
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
        reason: `Inventory limit reached. Upgrade to Plus or Premium for unlimited items.`,
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
        reason: `Monthly recipe limit reached. Upgrade to Plus or Premium for unlimited recipes.`,
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
        reason: `Monthly meal plan limit reached. Upgrade to Plus or Premium for unlimited meal plans.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Update subscription-related fields on the user document in a centralized way.
 * Fields omitted from the payload will be left unchanged.
 */
export async function updateUserSubscription(
  userId: string,
  updates: {
    subscriptionTier?: SubscriptionTierName;
    subscriptionStatus?: SubscriptionStatus;
    stripeCustomerId?: string | null;
    paypalSubscriptionId?: string | null;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
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

  await db.collection('users').doc(userId).update(updateData);
}

/**
 * Upsert a per-user subscription record that tracks provider-specific identifiers
 * and the latest status timestamps.
 */
export async function upsertUserSubscriptionRecord(
  userId: string,
  data: {
    provider: 'stripe' | 'paypal';
    subscriptionId?: string | null;
    status?: SubscriptionStatus;
    startDate?: Date | null;
    endDate?: Date | null;
  }
): Promise<void> {
  const now = new Date();

  const payload: Record<string, unknown> = {
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
    } else if (data.provider === 'paypal') {
      payload.paypalSubscriptionId = data.subscriptionId;
    }
  }

  await db.collection('subscriptions').doc(userId).set(payload, { merge: true });
}

