import { db } from './firebase';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

interface RateLimitDoc {
  requests: Array<{ timestamp: number }>;
  lastUpdated: number;
}

/**
 * Rate limiter using Firestore for distributed tracking.
 * Implements a sliding window rate limit algorithm.
 *
 * @param userId - The user ID to track
 * @param bucket - The rate limit bucket (e.g., 'global', 'api', etc.)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Promise resolving to rate limit result
 */
export async function checkAndIncrement(
  userId: string,
  bucket: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const rateLimitKey = `${userId}_${bucket}`;
    const rateLimitRef = db.collection('rateLimits').doc(rateLimitKey);

    // Use Firestore transaction to ensure atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() as RateLimitDoc | undefined;

      // Filter out requests outside the current window
      // This cleanup prevents unbounded array growth
      const recentRequests = (data?.requests || []).filter(
        (req) => req.timestamp > windowStart
      );

      // Check if limit is exceeded
      if (recentRequests.length >= maxRequests) {
        return {
          allowed: false,
          reason: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        };
      }

      // Add current request and update document
      recentRequests.push({ timestamp: now });
      
      transaction.set(rateLimitRef, {
        requests: recentRequests,
        lastUpdated: now,
      });

      return { allowed: true };
    });

    return result;
  } catch (error: unknown) {
    console.error('Rate limit check error:', error);
    // Fail closed to prevent abuse during errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      allowed: false,
      reason: `Rate limit check unavailable: ${errorMessage}`,
    };
  }
}
