import type { UtmParams } from "@/types/game";

// SERVER-ONLY: dùng biến môi trường bí mật, không import từ code client.

export interface LeadRecord {
  /** ISO 8601. */
  submittedAt: string;
  name: string;
  phone: string;
  project?: string;
  averageScore: number;
  levelScores: Record<string, number>;
  rankId: string;
  rankTitle: string;
  voucherCode: string;
  voucherValue: number;
  utm: UtmParams;
  durationMs?: number;
  /** `true` nếu điểm client báo lên khác điểm server tự chấm (dấu hiệu giả mạo). */
  scoreMismatch: boolean;
}

export type WebhookMode = "sent" | "mock";

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookError";
  }
}

interface Options {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  logger?: Pick<Console, "info" | "warn">;
}

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Gửi lead tới Google Sheets qua web app Apps Script (kèm secret trong body).
 * Thiếu `GOOGLE_SHEETS_WEBHOOK_URL` → chế độ mock: chỉ log (đã che tên/SĐT), trả `"mock"`.
 * @throws WebhookError khi cấu hình sai hoặc Apps Script không xác nhận đã ghi.
 */
export async function sendLeadToSheets(
  record: LeadRecord,
  { env = process.env, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, logger = console }: Options = {},
): Promise<WebhookMode> {
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!url) {
    logger.info("[lead:mock] GOOGLE_SHEETS_WEBHOOK_URL chưa cấu hình, không ghi Google Sheets.", {
      ...record,
      name: maskName(record.name),
      phone: maskPhone(record.phone),
    });
    if (env.NODE_ENV === "production") {
      logger.warn("[lead:mock] Đang chạy production mà chưa cấu hình webhook: lead KHÔNG được lưu ở đâu cả!");
    }
    return "mock";
  }

  const secret = env.WEBHOOK_SECRET?.trim();
  if (!secret) throw new WebhookError("Đã cấu hình GOOGLE_SHEETS_WEBHOOK_URL nhưng thiếu WEBHOOK_SECRET.");

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, source: "web-game", ...record }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow", // Apps Script trả 302 tới nơi chứa kết quả
    });
  } catch (error) {
    throw new WebhookError(`Không gọi được webhook: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new WebhookError(`Webhook trả HTTP ${response.status}.`);

  // Apps Script luôn trả 200; kết quả thật nằm trong JSON `{ ok: boolean }`.
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WebhookError("Webhook không trả JSON (kiểm tra quyền truy cập 'Anyone' của web app).");
  }
  if (!isOk(body)) {
    const reason = (body as { error?: unknown } | null)?.error;
    throw new WebhookError(`Webhook từ chối: ${typeof reason === "string" ? reason : "không rõ lý do"}.`);
  }
  return "sent";
}

const isOk = (v: unknown): boolean => typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true;

export const maskPhone = (phone: string): string =>
  phone.length > 4 ? `${phone.slice(0, 2)}${"*".repeat(phone.length - 6)}${phone.slice(-4)}` : "****";

export const maskName = (name: string): string => `${name.slice(0, 1)}***`;
