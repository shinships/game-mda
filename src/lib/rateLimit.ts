/**
 * Rate limit cửa sổ trượt, lưu trong bộ nhớ tiến trình.
 * Lưu ý: trên serverless (Vercel) mỗi instance có bộ đếm riêng nên đây chỉ là lớp chặn spam cơ bản;
 * chặn triệt để cần store dùng chung (Upstash/Redis, Vercel WAF).
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Số giây nên chờ trước khi thử lại (0 nếu được phép). */
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
}

interface Options {
  limit: number;
  windowMs: number;
  /** Số key tối đa được nhớ, tránh phình bộ nhớ. */
  maxKeys?: number;
}

export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: Options): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)),
        };
      }

      recent.push(now);
      // Map giữ thứ tự chèn: xoá rồi set để key vừa dùng nằm cuối, key cũ nhất bị loại đầu tiên.
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      return { allowed: true, remaining: limit - recent.length, retryAfterSec: 0 };
    },
  };
}
