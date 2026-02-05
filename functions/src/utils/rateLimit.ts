import { db } from './firebase';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
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
      const data = doc.data() as { requests: Array<{ timestamp: number }> } | undefined;

      // Filter out requests outside the current window
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
        lastUpdated: new Date(),
      });

      return { allowed: true };
    });

    return result;
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    // In case of error, allow the request but log the issue
    return {
      allowed: true,
      reason: 'Rate limit check failed, allowing request',
    };
  }
}
