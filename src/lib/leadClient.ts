import { LEAD_ERROR_MESSAGES } from "@/lib/leadErrors";
import { leadSuccessResponseSchema } from "@/lib/validation/lead";
import type { LeadErrorCode, LeadErrorResponse, LeadPayload, LeadSubmitOutcome } from "@/types/game";

export const LEAD_ENDPOINT = "/api/lead";
const DEFAULT_TIMEOUT_MS = 15_000;


const fail = (error: LeadErrorCode, extra: Partial<LeadErrorResponse> = {}): LeadErrorResponse => ({
  ok: false,
  error,
  message: LEAD_ERROR_MESSAGES[error],
  ...extra,
});

interface SubmitOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Gọi `POST /api/lead`. KHÔNG BAO GIỜ throw: mọi lỗi được trả về dạng `LeadErrorResponse`. */
export async function submitLeadRequest(
  payload: LeadPayload,
  { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch }: SubmitOptions = {},
): Promise<LeadSubmitOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    return fail("NETWORK");
  } finally {
    clearTimeout(timer);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail(response.status >= 500 ? "SERVER" : "UPSTREAM");
  }

  if (response.ok) {
    const parsed = leadSuccessResponseSchema.safeParse(body);
    return parsed.success ? parsed.data : fail("SERVER");
  }
  return toErrorResponse(response.status, body);
}

const ERROR_CODES = Object.keys(LEAD_ERROR_MESSAGES) as LeadErrorCode[];

function toErrorResponse(status: number, body: unknown): LeadErrorResponse {
  const b = (typeof body === "object" && body !== null ? body : {}) as Partial<LeadErrorResponse>;
  const code: LeadErrorCode =
    b.error && ERROR_CODES.includes(b.error)
      ? b.error
      : status === 429
        ? "RATE_LIMITED"
        : status >= 500
          ? "SERVER"
          : "VALIDATION";
  return fail(code, {
    ...(typeof b.message === "string" && b.message ? { message: b.message } : {}),
    ...(b.fieldErrors ? { fieldErrors: b.fieldErrors } : {}),
    ...(typeof b.retryAfterSec === "number" ? { retryAfterSec: b.retryAfterSec } : {}),
  });
}
