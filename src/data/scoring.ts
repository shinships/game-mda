import type {
  BudgetTier,
  EvaluationStatus,
  SlotKey,
  SlotVerdict,
  VisualEffect,
} from "@/types/game";

/** Trọng số điểm từng lớp (tổng 100). */
export const SLOT_WEIGHTS: Record<SlotKey, number> = {
  core: 50,
  surface: 25,
  edge: 25,
};

/** Tỉ lệ điểm nhận được theo mức độ phù hợp của lựa chọn. */
export const SLOT_CREDIT: Record<SlotVerdict, number> = {
  IDEAL: 1,
  ACCEPTABLE: 0.5,
  /** Không nằm trong danh sách ideal/acceptable/forbidden. */
  NEUTRAL: 0.1,
  FORBIDDEN: 0,
};

/** Chọn cốt bị cấm → tổng điểm tối đa bằng mức này (luôn thuộc vùng FAIL). */
export const FORBIDDEN_SCORE_CAP = 40;

export const STATUS_THRESHOLDS = { PERFECT: 80, PASS: 50 } as const;

/** [điểm tối thiểu, số sao], xét từ trên xuống; không khớp → 1 sao. */
export const STAR_THRESHOLDS: ReadonlyArray<readonly [number, 2 | 3 | 4 | 5]> = [
  [90, 5],
  [70, 4],
  [50, 3],
  [30, 2],
];

/**
 * Luật "quá tay" theo ngân sách: tổng `costIndex` 3 lớp vượt `maxCostIndex` → trừ `overspendPenalty`.
 * Tier không có trong bảng thì không áp dụng. Test dữ liệu đảm bảo combo ideal không bao giờ vượt trần.
 */
export const BUDGET_RULES: Partial<
  Record<BudgetTier, { maxCostIndex: number; overspendPenalty: number }>
> = {
  BUDGET: { maxCostIndex: 7, overspendPenalty: 5 },
};

/** Thứ tự ưu tiên khi nhiều lỗi cùng kích hoạt: lỗi nặng/mất thẩm mỹ nhất thắng. */
export const EFFECT_PRIORITY: readonly VisualEffect[] = [
  "BULGING_EDGES",
  "WARPING",
  "SCRATCHED",
  "PERFECT_GLOSS",
];

export const DEFAULT_FORBIDDEN_EFFECT: VisualEffect = "BULGING_EDGES";
/** Kết quả chỉ ở mức PASS mà không dính luật phạt nào → xuống cấp nhẹ theo thời gian. */
export const IMPERFECT_EFFECT: VisualEffect = "SCRATCHED";

export const HEADLINES: Record<EvaluationStatus, string> = {
  PERFECT: "Phối Vật Liệu Đạt Chuẩn KTS",
  PASS: "Dùng được, nhưng chưa tối ưu",
  FAIL: "Cảnh Báo Rủi Ro Vật Liệu!",
};
