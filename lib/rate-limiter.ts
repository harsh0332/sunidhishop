/**
 * Lightweight in-memory rate limiter for protecting sensitive administrative
 * and telemetry endpoints against abuse without restricting public storefront browsing.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodic garbage collection every 5 minutes to avoid memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((record, key) => {
      if (record.resetTime <= now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.store.delete(key));
  }

  public check(
    identifier: string,
    maxRequests: number = 60,
    windowMs: number = 60 * 1000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || record.resetTime <= now) {
      const resetTime = now + windowMs;
      this.store.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  public reset(): void {
    this.store.clear();
  }
}

export const rateLimiter = new InMemoryRateLimiter();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60 * 1000
) {
  return rateLimiter.check(identifier, maxRequests, windowMs);
}

export function getRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetTime: number },
  maxRequests: number = 60
): Record<string, string> {
  const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(retryAfter) }),
  };
}

export function resetRateLimits(): void {
  rateLimiter.reset();
}
