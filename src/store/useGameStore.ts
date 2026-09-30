import { useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isMaterialForSlot, SLOT_ORDER } from "@/data/materials";
import { SCENARIOS } from "@/data/scenarios";
import { track } from "@/lib/analytics";
import { evaluateChoice } from "@/lib/evaluator";
import { canTransition } from "@/lib/gameFlow";
import { submitLeadRequest } from "@/lib/leadClient";
import { averageScore, getRank } from "@/lib/ranking";
import { mergeUtm, readUtmFromLocation } from "@/lib/utm";
import { leadFormSchema } from "@/lib/validation/lead";
import type {
  EvaluationResult,
  GamePhase,
  LeadFormValues,
  LeadPayload,
  LeadSubmitOutcome,
  LeadSuccessResponse,
  MaterialId,
  PlayerSelection,
  RankTier,
  RoomScenario,
  SlotKey,
  UtmParams,
} from "@/types/game";
import { EMPTY_SELECTION, isCompleteSelection, restoreGame, type PersistedGame } from "./restore";

// -----------------------------------------------------------------------------
// State & actions
// -----------------------------------------------------------------------------

export interface GameData {
  phase: GamePhase;
  /** Chỉ số màn hiện tại (0-based). */
  levelIndex: number;
  totalLevels: number;
  /** scenarioId → lựa chọn 3 lớp. */
  selections: Record<string, PlayerSelection>;
  /** scenarioId → kết quả chấm; có sau `runTest()`. */
  results: Record<string, EvaluationResult>;
  startedAt: number | null;
  /** Thời điểm hoàn thành màn cuối (vào SUMMARY). */
  finishedAt: number | null;
  utm: UtmParams;
  /** Voucher server trả về; có khi phase = SUCCESS. */
  voucher: LeadSuccessResponse | null;
  /** Thông báo lỗi tiếng Việt khi phase = SUBMIT_ERROR. */
  submitError: string | null;
  hasHydrated: boolean;
}

export interface GameActions {
  start: () => void;
  select: (slot: SlotKey, value: MaterialId) => void;
  runTest: () => void;
  finishTest: () => void;
  next: () => void;
  openLeadForm: () => void;
  submitLead: (values: LeadFormValues) => Promise<LeadSubmitOutcome>;
  reset: () => void;
}

export type GameState = GameData & GameActions;

/** Tiến trình ban đầu. `utm` và `hasHydrated` không nằm ở đây vì `reset()` phải giữ nguyên hai giá trị này. */
const initialProgress = (): Omit<GameData, "utm" | "hasHydrated"> => ({
  phase: "INTRO",
  levelIndex: 0,
  totalLevels: SCENARIOS.length,
  selections: {},
  results: {},
  startedAt: null,
  finishedAt: null,
  voucher: null,
  submitError: null,
});

// -----------------------------------------------------------------------------
// Selectors (trả về tham chiếu ổn định, dùng trực tiếp với `useGameStore(selector)`)
// -----------------------------------------------------------------------------

export const selectCurrentScenario = (s: GameData): RoomScenario => SCENARIOS[s.levelIndex];

export const selectCurrentSelection = (s: GameData): PlayerSelection =>
  s.selections[SCENARIOS[s.levelIndex].id] ?? EMPTY_SELECTION;

export const selectCurrentResult = (s: GameData): EvaluationResult | null =>
  s.results[SCENARIOS[s.levelIndex].id] ?? null;

/** `true` khi đang chọn và đã đủ 3 lớp → bật nút "Kiểm định". */
export const selectCanTest = (s: GameData): boolean =>
  s.phase === "SELECTING" && isCompleteSelection(s.selections[SCENARIOS[s.levelIndex].id]);

const scoresOf = (s: GameData): number[] =>
  SCENARIOS.flatMap((sc) => (s.results[sc.id] ? [s.results[sc.id].score] : []));

/** Tổng điểm các màn đã chấm. */
export const selectTotalScore = (s: GameData): number => scoresOf(s).reduce((sum, x) => sum + x, 0);

/** Điểm trung bình (làm tròn) các màn đã chấm. */
export const selectAverageScore = (s: GameData): number => averageScore(scoresOf(s));

export const selectRank = (s: GameData): RankTier => getRank(selectAverageScore(s));

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const GAME_STORAGE_KEY = "mda-game-v1";

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const canGo = (to: GamePhase) => canTransition(get().phase, to);

      return {
        ...initialProgress(),
        utm: {},
        hasHydrated: false,

        start: () => {
          if (!canGo("BRIEF")) return;
          set((s) => ({
            phase: "BRIEF",
            levelIndex: 0,
            selections: {},
            results: {},
            startedAt: Date.now(),
            finishedAt: null,
            utm: mergeUtm(s.utm, readUtmFromLocation()),
          }));
          track("game_start", { total_levels: SCENARIOS.length });
        },

        select: (slot, value) => {
          const { phase, levelIndex } = get();
          if (phase !== "BRIEF" && phase !== "SELECTING") return;
          if (!SLOT_ORDER.includes(slot) || !isMaterialForSlot(slot, value)) return;
          const id = SCENARIOS[levelIndex].id;
          set((s) => ({
            phase: "SELECTING",
            selections: { ...s.selections, [id]: { ...(s.selections[id] ?? EMPTY_SELECTION), [slot]: value } },
          }));
        },

        runTest: () => {
          const { phase, levelIndex, selections, results } = get();
          if (phase !== "SELECTING") return;
          const scenario = SCENARIOS[levelIndex];
          const selection = selections[scenario.id];
          if (!isCompleteSelection(selection)) return;
          const result = evaluateChoice(scenario, selection);
          set({ phase: "TESTING", results: { ...results, [scenario.id]: result } });
          track("level_complete", {
            level: scenario.level,
            scenario_id: scenario.id,
            score: result.score,
            status: result.status,
          });
        },

        finishTest: () => {
          if (canGo("RESULT")) set({ phase: "RESULT" });
        },

        next: () => {
          const { phase, levelIndex } = get();
          if (phase === "BRIEF") {
            set({ phase: "SELECTING" });
            return;
          }
          if (phase !== "RESULT") return;
          if (levelIndex + 1 < SCENARIOS.length) {
            set({ phase: "BRIEF", levelIndex: levelIndex + 1 });
            return;
          }
          set({ phase: "SUMMARY", finishedAt: Date.now() });
          const state = get();
          track("game_complete", {
            total_score: selectTotalScore(state),
            average_score: selectAverageScore(state),
            rank: selectRank(state).id,
          });
        },

        openLeadForm: () => {
          if (canGo("LEAD_FORM")) set({ phase: "LEAD_FORM", submitError: null });
        },

        submitLead: async (values) => {
          if (!canGo("SUBMITTING")) {
            return { ok: false, error: "INVALID_STATE", message: "Không thể gửi thông tin ở bước này." };
          }
          const parsed = leadFormSchema.safeParse(values);
          if (!parsed.success) {
            const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[]>;
            return {
              ok: false,
              error: "VALIDATION",
              message: Object.values(fieldErrors).flat()[0] ?? "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.",
              fieldErrors,
            };
          }

          const snapshot = get();
          const payload: LeadPayload = {
            ...parsed.data,
            selections: snapshot.selections,
            clientScore: selectAverageScore(snapshot),
            durationMs:
              snapshot.startedAt && snapshot.finishedAt ? Math.max(0, snapshot.finishedAt - snapshot.startedAt) : undefined,
            utm: snapshot.utm,
          };

          set({ phase: "SUBMITTING", submitError: null });
          const outcome = await submitLeadRequest(payload);

          // Người chơi đã bấm reset trong lúc chờ: bỏ qua kết quả.
          if (get().phase !== "SUBMITTING") return outcome;

          if (outcome.ok) {
            set({ phase: "SUCCESS", voucher: outcome, submitError: null });
            track("Lead", { rank: outcome.rank.id, value: outcome.voucherValue, currency: "VND" });
          } else {
            set({ phase: "SUBMIT_ERROR", submitError: outcome.message });
          }
          return outcome;
        },

        reset: () => {
          set({ ...initialProgress() });
        },
      };
    },
    {
      name: GAME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Hydrate thủ công sau khi mount (xem `useGameHydrated`) để tránh lệch HTML server/client.
      skipHydration: true,
      partialize: (s): PersistedGame => ({
        phase: s.phase,
        levelIndex: s.levelIndex,
        selections: s.selections,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        utm: s.utm,
        voucher: s.voucher,
      }),
      merge: (persisted, current) => {
        const restored = restoreGame(persisted);
        return restored ? { ...current, ...restored } : current;
      },
    },
  ),
);

// -----------------------------------------------------------------------------
// Hydration
// -----------------------------------------------------------------------------

let hydration: Promise<void> | null = null;

/** Nạp tiến trình từ sessionStorage đúng một lần rồi bật `hasHydrated`. An toàn khi gọi nhiều lần. */
export function hydrateGameStore(): Promise<void> {
  if (!hydration) {
    hydration = Promise.resolve(useGameStore.persist.rehydrate())
      .catch(() => undefined)
      .then(() => {
        useGameStore.setState({ hasHydrated: true });
      });
  }
  return hydration;
}

/**
 * Gọi một lần trong `GameContainer`. Trả `false` cho tới khi đã nạp xong tiến trình đã lưu
 * (render Hero/skeleton trong lúc chờ để không bị lệch SSR).
 */
export function useGameHydrated(): boolean {
  const hydrated = useGameStore((s) => s.hasHydrated);
  useEffect(() => {
    void hydrateGameStore();
  }, []);
  return hydrated;
}
