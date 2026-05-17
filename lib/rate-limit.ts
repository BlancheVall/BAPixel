type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(options.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: options.limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}
