import { isMaterialForSlot, SLOT_ORDER } from "@/data/materials";
import { SCENARIOS } from "@/data/scenarios";
import { evaluateChoice } from "@/lib/evaluator";
import { ALL_PHASES } from "@/lib/gameFlow";
import { sanitizeUtm } from "@/lib/utm";
import { leadSuccessResponseSchema } from "@/lib/validation/lead";
import type {
  EvaluationResult,
  GamePhase,
  LeadSuccessResponse,
  PlayerSelection,
  UtmParams,
} from "@/types/game";

export const EMPTY_SELECTION: Readonly<PlayerSelection> = Object.freeze({
  core: null,
  surface: null,
  edge: null,
});

export function isCompleteSelection(s: PlayerSelection | undefined): s is PlayerSelection {
  return !!s && SLOT_ORDER.every((slot) => s[slot] !== null);
}

/** Dữ liệu tiến trình được lưu vào sessionStorage (KHÔNG có tên/SĐT, KHÔNG có `results` — tính lại từ `selections`). */
export interface PersistedGame {
  phase: GamePhase;
  levelIndex: number;
  selections: Record<string, PlayerSelection>;
  startedAt: number | null;
  finishedAt: number | null;
  utm: UtmParams;
  voucher: LeadSuccessResponse | null;
}

export interface RestoredGame extends PersistedGame {
  results: Record<string, EvaluationResult>;
}

/** Từ phase này trở đi, màn hiện tại đã có kết quả chấm. */
const PHASES_WITH_RESULT: ReadonlySet<GamePhase> = new Set([
  "TESTING",
  "RESULT",
  "SUMMARY",
  "LEAD_FORM",
  "SUBMITTING",
  "SUCCESS",
  "SUBMIT_ERROR",
]);
/** Các phase diễn ra sau khi đã chơi hết mọi màn. */
const PHASES_AFTER_LAST_LEVEL: ReadonlySet<GamePhase> = new Set([
  "SUMMARY",
  "LEAD_FORM",
  "SUBMITTING",
  "SUCCESS",
  "SUBMIT_ERROR",
]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const timestamp = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

function restoreSelection(raw: unknown): PlayerSelection {
  const out: PlayerSelection = { ...EMPTY_SELECTION };
  if (!isRecord(raw)) return out;
  for (const slot of SLOT_ORDER) {
    const value = raw[slot];
    if (isMaterialForSlot(slot, value)) (out as unknown as Record<string, unknown>)[slot] = value;
  }
  return out;
}

/**
 * Khôi phục & kiểm tra dữ liệu đọc từ sessionStorage.
 * Trả `null` nếu dữ liệu hỏng/không nhất quán (store sẽ bắt đầu lại từ INTRO).
 * Phase "đang chạy dở" được đưa về phase ổn định gần nhất: TESTING → RESULT, SUBMITTING/SUBMIT_ERROR → LEAD_FORM.
 */
export function restoreGame(raw: unknown): RestoredGame | null {
  if (!isRecord(raw)) return null;

  let phase = raw.phase as GamePhase;
  if (!ALL_PHASES.includes(phase) || phase === "INTRO") return null;

  const levelIndex = raw.levelIndex;
  if (typeof levelIndex !== "number" || !Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= SCENARIOS.length) {
    return null;
  }
  if (PHASES_AFTER_LAST_LEVEL.has(phase) && levelIndex !== SCENARIOS.length - 1) return null;

  const rawSelections = isRecord(raw.selections) ? raw.selections : {};
  const selections: Record<string, PlayerSelection> = {};
  for (const s of SCENARIOS) selections[s.id] = restoreSelection(rawSelections[s.id]);

  if (phase === "TESTING") phase = "RESULT";
  if (phase === "SUBMITTING" || phase === "SUBMIT_ERROR") phase = "LEAD_FORM";

  // Chấm lại từ lựa chọn thay vì tin dữ liệu lưu trữ.
  const results: Record<string, EvaluationResult> = {};
  for (const [i, scenario] of SCENARIOS.entries()) {
    const hasResult = i < levelIndex || (i === levelIndex && PHASES_WITH_RESULT.has(phase));
    if (!hasResult) continue;
    const selection = selections[scenario.id];
    if (!isCompleteSelection(selection)) return null;
    results[scenario.id] = evaluateChoice(scenario, selection);
  }

  let voucher: LeadSuccessResponse | null = null;
  if (phase === "SUCCESS") {
    const parsed = leadSuccessResponseSchema.safeParse(raw.voucher);
    if (parsed.success) voucher = parsed.data;
    else phase = "LEAD_FORM";
  }

  return {
    phase,
    levelIndex,
    selections,
    results,
    startedAt: timestamp(raw.startedAt),
    finishedAt: timestamp(raw.finishedAt),
    utm: sanitizeUtm(raw.utm),
    voucher,
  };
}
