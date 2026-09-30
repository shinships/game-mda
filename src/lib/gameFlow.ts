import type { GamePhase } from "@/types/game";

/**
 * Bảng chuyển phase hợp lệ của state machine.
 * `reset()` là ngoại lệ duy nhất: được gọi ở mọi phase và luôn về INTRO (không nằm trong bảng).
 */
export const PHASE_TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  INTRO: ["BRIEF"],
  BRIEF: ["SELECTING"],
  SELECTING: ["TESTING"],
  TESTING: ["RESULT"],
  RESULT: ["BRIEF", "SUMMARY"], // BRIEF: màn kế tiếp · SUMMARY: hết màn
  SUMMARY: ["LEAD_FORM"],
  LEAD_FORM: ["SUBMITTING"],
  SUBMITTING: ["SUCCESS", "SUBMIT_ERROR"],
  SUBMIT_ERROR: ["SUBMITTING", "LEAD_FORM"], // thử lại ngay hoặc quay lại form
  SUCCESS: [],
};

export const ALL_PHASES = Object.keys(PHASE_TRANSITIONS) as GamePhase[];

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return PHASE_TRANSITIONS[from].includes(to);
}
