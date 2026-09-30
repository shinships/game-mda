import { getMaterial, isMaterialForSlot, SLOT_LABELS, SLOT_ORDER } from "@/data/materials";
import {
  BUDGET_RULES,
  DEFAULT_FORBIDDEN_EFFECT,
  EFFECT_PRIORITY,
  FORBIDDEN_SCORE_CAP,
  HEADLINES,
  IMPERFECT_EFFECT,
  SLOT_CREDIT,
  SLOT_WEIGHTS,
  STAR_THRESHOLDS,
  STATUS_THRESHOLDS,
} from "@/data/scoring";
import type {
  AppliedPenalty,
  CompleteSelection,
  EvaluationResult,
  EvaluationStatus,
  MaterialId,
  PenaltyRule,
  PlayerSelection,
  RoomScenario,
  SlotBreakdown,
  SlotKey,
  SlotVerdict,
  VisualEffect,
} from "@/types/game";

/**
 * Rules engine: chấm điểm một lựa chọn 3 lớp cho một màn chơi.
 * PURE FUNCTION: không I/O, không Date, không random. Kết quả chỉ phụ thuộc đầu vào.
 *
 * Điểm = Cốt 50 + Bề mặt 25 + Nẹp 25 (ideal 100% · acceptable 50% · khác 10% · forbidden 0%)
 *        − penaltyRules − phạt "quá tay" (chỉ màn BUDGET), rồi áp trần điểm nếu chọn cốt bị cấm.
 *
 * @throws Error nếu thiếu lớp nào hoặc id không thuộc đúng lớp.
 */
export function evaluateChoice(
  scenario: RoomScenario,
  choice: PlayerSelection,
): EvaluationResult {
  const selection = assertComplete(choice);

  // 1. Điểm từng lớp
  const breakdown: SlotBreakdown[] = SLOT_ORDER.map((slot) => {
    const material = selection[slot];
    const verdict = verdictFor(scenario, slot, material);
    const maxPoints = SLOT_WEIGHTS[slot];
    return { slot, material, verdict, points: maxPoints * SLOT_CREDIT[verdict], maxPoints };
  });
  const forbiddenCoreChosen = breakdown.some((b) => b.verdict === "FORBIDDEN");

  // 2. Luật trừ điểm dạng dữ liệu
  const triggeredRules = scenario.penaltyRules.filter((rule) => ruleMatches(rule, selection));
  const penalties: AppliedPenalty[] = triggeredRules.map((rule) => ({
    id: rule.id,
    points: rule.penalty,
    message: rule.message,
  }));

  // 3. "Quá tay" so với ngân sách
  const budgetRule = BUDGET_RULES[scenario.budgetTier];
  const totalCost = SLOT_ORDER.reduce((sum, slot) => sum + getMaterial(selection[slot]).costIndex, 0);
  const overspent = budgetRule !== undefined && totalCost > budgetRule.maxCostIndex;
  const overspendPenalty = overspent && budgetRule ? budgetRule.overspendPenalty : 0;

  // 4. Tổng hợp điểm
  let raw =
    breakdown.reduce((sum, b) => sum + b.points, 0) -
    penalties.reduce((sum, p) => sum + p.points, 0) -
    overspendPenalty;
  if (forbiddenCoreChosen) raw = Math.min(raw, FORBIDDEN_SCORE_CAP);
  for (const rule of triggeredRules) {
    if (rule.capScore !== undefined) raw = Math.min(raw, rule.capScore);
  }
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  const status = statusFor(score);
  const stars = starsFor(score);

  // 5. Hiệu ứng trực quan
  const effects: VisualEffect[] = triggeredRules.map((r) => r.visualEffect);
  if (forbiddenCoreChosen) {
    effects.push(scenario.technicalRules.forbiddenEffect ?? DEFAULT_FORBIDDEN_EFFECT);
  }
  const visualEffect = pickEffect(effects, status);

  // 6. Phản hồi kỹ thuật
  const reasons: string[] = [];
  const explainedSlots = new Set<SlotKey>();
  if (forbiddenCoreChosen) {
    explainedSlots.add("core");
    reasons.push(
      scenario.technicalRules.warningMessage ??
        `${getMaterial(selection.core).label} không phù hợp với khu vực này.`,
    );
  }
  for (const rule of triggeredRules) {
    for (const slot of Object.keys(rule.when) as SlotKey[]) explainedSlots.add(slot);
    reasons.push(rule.message);
  }
  for (const b of breakdown) {
    if (explainedSlots.has(b.slot) || b.verdict === "IDEAL") continue;
    reasons.push(slotNote(b));
  }
  if (overspent) {
    reasons.push(
      `Bạn chọn vật liệu vượt mức đầu tư cần thiết cho hạng mục này (trừ ${overspendPenalty} điểm).`,
    );
  }

  const perfectlyChosen = reasons.length === 0;
  const { perfectExplanation } = scenario.technicalRules;

  return {
    score,
    stars,
    status,
    visualEffect,
    feedback: {
      headline: HEADLINES[status],
      explanation: perfectlyChosen ? perfectExplanation : reasons.join(" "),
      // Chọn đúng → mẹo mở rộng; chọn chưa tối ưu → chỉ ra đáp án chuẩn để người chơi học.
      expertTip: perfectlyChosen ? scenario.expertTip : perfectExplanation,
    },
    breakdown,
    penalties,
    overspent,
    ...(overspent && { budgetNote: scenario.budgetNote ?? DEFAULT_BUDGET_NOTE }),
  };
}

const DEFAULT_BUDGET_NOTE =
  "Hãy chọn vật liệu vừa đủ cho nhu cầu thực tế của khách thay vì đầu tư quá tay.";

function assertComplete(choice: PlayerSelection): CompleteSelection {
  for (const slot of SLOT_ORDER) {
    const value = choice[slot];
    if (value === null || value === undefined) {
      throw new Error(`Thiếu lựa chọn cho lớp "${SLOT_LABELS[slot]}" (${slot}).`);
    }
    if (!isMaterialForSlot(slot, value)) {
      throw new Error(`Giá trị "${String(value)}" không hợp lệ cho lớp "${SLOT_LABELS[slot]}" (${slot}).`);
    }
  }
  return choice as CompleteSelection;
}

function verdictFor(scenario: RoomScenario, slot: SlotKey, material: MaterialId): SlotVerdict {
  if (slot === "core" && (scenario.technicalRules.forbiddenCores as MaterialId[]).includes(material)) {
    return "FORBIDDEN";
  }
  if ((scenario.idealCombination[slot] as MaterialId[]).includes(material)) return "IDEAL";
  if ((scenario.acceptableCombination[slot] as MaterialId[]).includes(material)) return "ACCEPTABLE";
  return "NEUTRAL";
}

/** Khớp khi MỌI slot khai báo trong `when` chứa lựa chọn; `when` rỗng không bao giờ khớp. */
function ruleMatches(rule: PenaltyRule, selection: CompleteSelection): boolean {
  const slots = SLOT_ORDER.filter((slot) => (rule.when[slot]?.length ?? 0) > 0);
  if (slots.length === 0) return false;
  return slots.every((slot) => (rule.when[slot] as MaterialId[]).includes(selection[slot]));
}

function statusFor(score: number): EvaluationStatus {
  if (score >= STATUS_THRESHOLDS.PERFECT) return "PERFECT";
  if (score >= STATUS_THRESHOLDS.PASS) return "PASS";
  return "FAIL";
}

function starsFor(score: number): EvaluationResult["stars"] {
  for (const [min, stars] of STAR_THRESHOLDS) {
    if (score >= min) return stars;
  }
  return 1;
}

function pickEffect(effects: VisualEffect[], status: EvaluationStatus): VisualEffect {
  for (const effect of EFFECT_PRIORITY) {
    if (effects.includes(effect)) return effect;
  }
  return status === "PERFECT" ? "PERFECT_GLOSS" : IMPERFECT_EFFECT;
}

function slotNote(b: SlotBreakdown): string {
  const label = getMaterial(b.material).shortLabel;
  const slotName = SLOT_LABELS[b.slot].toLowerCase();
  return b.verdict === "ACCEPTABLE"
    ? `${label} dùng được cho ${slotName} ở khu vực này nhưng chưa phải lựa chọn tối ưu.`
    : `${label} chưa thật sự phù hợp cho ${slotName} theo yêu cầu của khách.`;
}
