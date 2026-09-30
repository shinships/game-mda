import type { UtmParams } from "@/types/game";

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
] as const satisfies readonly (keyof UtmParams)[];

const MAX_LEN = 200;

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_LEN);
  return v || undefined;
}

/** Lấy các tham số UTM/click-id từ một object bất kỳ (bỏ key lạ, cắt độ dài, bỏ ký tự điều khiển). */
export function sanitizeUtm(input: unknown): UtmParams {
  const out: UtmParams = {};
  if (typeof input !== "object" || input === null) return out;
  for (const key of UTM_KEYS) {
    const v = clean((input as Record<string, unknown>)[key]);
    if (v) out[key] = v;
  }
  return out;
}

/** Parse từ chuỗi query, ví dụ `?utm_source=facebook&fbclid=abc`. */
export function parseUtm(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const obj: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v !== null) obj[key] = v;
  }
  return sanitizeUtm(obj);
}

/** Đọc từ URL hiện tại; trả `{}` khi chạy ngoài trình duyệt. */
export function readUtmFromLocation(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    return parseUtm(window.location.search);
  } catch {
    return {};
  }
}

/** Giá trị mới (nếu có) ghi đè giá trị cũ; khóa không có trong `next` giữ nguyên. */
export function mergeUtm(prev: UtmParams, next: UtmParams): UtmParams {
  return { ...prev, ...next };
}
