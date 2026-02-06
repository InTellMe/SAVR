import { db } from './firebase';

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_LIMIT = 100;

/**
 * Per-user, per-key rate limit using a rolling window in Firestore.
 * Uses collection apiUsage/{uid} with fields: { [key]: { windowStart, count } }.
 *
 * @param uid User ID
 * @param key Rate limit key (e.g. 'global' for all callables)
 * @param limit Max requests per window
 * @param windowMs Window length in milliseconds
 * @returns { allowed: true } or { allowed: false, reason: string }
 */
export async function checkAndIncrement(
  uid: string,
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<{ allowed: boolean; reason?: string }> {
  const ref = db.collection('apiUsage').doc(uid);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data: Record<string, unknown> = snap.data() ?? {};
    const bucket = (data[key] as { windowStart?: number; count?: number } | undefined) ?? {};
    const windowStart = bucket.windowStart ?? 0;
    const count = bucket.count ?? 0;

    const inWindow = now - windowStart < windowMs;
    const newWindowStart = inWindow ? windowStart : now;
    const newCount = inWindow ? count + 1 : 1;

    if (newCount > limit) {
      return {
        allowed: false,
        reason: 'API rate limit exceeded. Please try again in a minute.',
      };
    }

    tx.set(ref, { [key]: { windowStart: newWindowStart, count: newCount } }, { merge: true });
    return { allowed: true };
  });
}
