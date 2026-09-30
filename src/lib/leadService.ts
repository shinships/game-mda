import { SCENARIOS } from "@/data/scenarios";
import { evaluateChoice } from "@/lib/evaluator";
import { summarizeScores } from "@/lib/ranking";
import type { LeadSuccessResponse, PlayerSelection, RankTier } from "@/types/game";

/** Kết quả server tự chấm lại từ `selections`. Điểm client gửi lên không bao giờ được dùng ở đây. */
export interface ServerScoring {
  levelScores: Record<string, number>;
  totalScore: number;
  averageScore: number;
  rank: RankTier;
}

export type ScoringOutcome =
  | ({ ok: true } & ServerScoring)
  | { ok: false; missing: string[] };

/** Chấm mọi màn từ lựa chọn của người chơi. `ok: false` nếu thiếu lựa chọn của màn nào. */
export function scoreSelections(selections: Record<string, PlayerSelection>): ScoringOutcome {
  const missing = SCENARIOS.filter((s) => !selections[s.id]).map((s) => s.id);
  if (missing.length > 0) return { ok: false, missing };

  const levelScores: Record<string, number> = {};
  for (const scenario of SCENARIOS) {
    levelScores[scenario.id] = evaluateChoice(scenario, selections[scenario.id]).score;
  }
  const summary = summarizeScores(Object.values(levelScores));
  return { ok: true, levelScores, totalScore: summary.total, averageScore: summary.average, rank: summary.rank };
}

/** Chỉ chấp nhận URL http(s); giá trị khác (rỗng, sai định dạng) → null. */
export function resolveZaloUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildSuccessResponse(
  scoring: Pick<ServerScoring, "rank" | "averageScore">,
  voucherCode: string,
  zaloUrl: string | null,
): LeadSuccessResponse {
  const { rank, averageScore } = scoring;
  return {
    ok: true,
    voucherCode,
    rank: { id: rank.id, title: rank.title },
    voucherValue: rank.voucherValue,
    voucherLabel: rank.voucherLabel,
    averageScore,
    zaloUrl,
  };
}
