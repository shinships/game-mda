import { z } from "zod";
import { RANKS } from "@/data/ranks";
import { LEAD_ERROR_MESSAGES } from "@/lib/leadErrors";
import { buildSuccessResponse, resolveZaloUrl, scoreSelections } from "@/lib/leadService";
import { createRateLimiter } from "@/lib/rateLimit";
import { generateVoucherCode } from "@/lib/voucher";
import { leadPayloadSchema } from "@/lib/validation/lead";
import { sendLeadToSheets, WebhookError } from "@/lib/webhook";
import type { LeadErrorCode, LeadErrorResponse } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tối đa 8 lượt gửi / 10 phút / IP (xem giới hạn của bộ đếm trong bộ nhớ ở rateLimit.ts). */
const limiter = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000 });
const MAX_BODY_CHARS = 20_000;


function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function error(code: LeadErrorCode, status: number, extra: Partial<LeadErrorResponse> = {}, headers?: Record<string, string>) {
  const body: LeadErrorResponse = { ok: false, error: code, message: LEAD_ERROR_MESSAGES[code], ...extra };
  return json(body, status, headers);
}

/** IP client. `x-forwarded-for` do nền tảng (Vercel) gán; ngoài môi trường tin cậy, header này có thể bị giả. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  const limit = limiter.check(clientIp(request));
  if (!limit.allowed) {
    return error("RATE_LIMITED", 429, { retryAfterSec: limit.retryAfterSec }, { "Retry-After": String(limit.retryAfterSec) });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) return error("VALIDATION", 413);
    body = JSON.parse(text);
  } catch {
    return error("VALIDATION", 400);
  }

  // Honeypot: bot điền ô ẩn → trả "thành công" giả để bot không đổi chiến thuật, không lưu gì.
  if (typeof body === "object" && body !== null && String((body as { website?: unknown }).website ?? "").trim() !== "") {
    console.warn("[lead] honeypot bị kích hoạt, bỏ qua yêu cầu.");
    const lowest = RANKS[RANKS.length - 1];
    return json(buildSuccessResponse({ rank: lowest, averageScore: 0 }, generateVoucherCode(lowest), null));
  }

  const parsed = leadPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION", 400, { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> });
  }
  const payload = parsed.data;

  // Server là nguồn sự thật: tự chấm lại từ lựa chọn, bỏ qua điểm client.
  const scoring = scoreSelections(payload.selections);
  if (!scoring.ok) {
    return error("INCOMPLETE_SELECTIONS", 400);
  }
  const scoreMismatch = payload.clientScore !== undefined && payload.clientScore !== scoring.averageScore;
  if (scoreMismatch) {
    console.warn("[lead] điểm client khác điểm server", { client: payload.clientScore, server: scoring.averageScore });
  }

  const voucherCode = generateVoucherCode(scoring.rank);

  try {
    await sendLeadToSheets({
      submittedAt: new Date().toISOString(),
      name: payload.name,
      phone: payload.phone,
      project: payload.project,
      averageScore: scoring.averageScore,
      levelScores: scoring.levelScores,
      rankId: scoring.rank.id,
      rankTitle: scoring.rank.title,
      voucherCode,
      voucherValue: scoring.rank.voucherValue,
      utm: payload.utm ?? {},
      durationMs: payload.durationMs,
      scoreMismatch,
    });
  } catch (err) {
    // Không trả voucher nếu chưa lưu được lead: để người chơi thử lại thay vì mất khách.
    console.error("[lead] ghi webhook thất bại:", err instanceof WebhookError ? err.message : err);
    return error("UPSTREAM", 502);
  }

  return json(buildSuccessResponse(scoring, voucherCode, resolveZaloUrl(process.env.NEXT_PUBLIC_ZALO_OA_URL)));
}
