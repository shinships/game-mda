import { RANKS } from "@/data/ranks";
import type { RankId, RankTier } from "@/types/game";

/** Rank tương ứng điểm trung bình (so sánh trực tiếp, không làm tròn thêm). */
export function getRank(averageScore: number): RankTier {
  return RANKS.find((rank) => averageScore >= rank.minScore) ?? RANKS[RANKS.length - 1];
}

export function getRankById(id: RankId): RankTier {
  const rank = RANKS.find((r) => r.id === id);
  if (!rank) throw new Error(`Không tìm thấy rank: ${id}`);
  return rank;
}

/** Điểm trung bình làm tròn về số nguyên (khớp với điểm hiển thị cho người chơi). 0 nếu chưa có màn nào. */
export function averageScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export interface ScoreSummary {
  total: number;
  average: number;
  rank: RankTier;
}

/** Tổng hợp điểm các màn → tổng, trung bình (làm tròn) và rank. Dùng chung cho client và server. */
export function summarizeScores(scores: readonly number[]): ScoreSummary {
  const average = averageScore(scores);
  return {
    total: scores.reduce((sum, s) => sum + s, 0),
    average,
    rank: getRank(average),
  };
}
