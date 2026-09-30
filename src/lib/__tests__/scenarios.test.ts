import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isMaterialForSlot, MATERIALS, MATERIALS_BY_SLOT } from "@/data/materials";
import { BUDGET_RULES, SLOT_WEIGHTS } from "@/data/scoring";
import { SCENARIOS } from "@/data/scenarios";
import { evaluateChoice } from "@/lib/evaluator";
import type { MaterialId, RoomScenario, SlotKey } from "@/types/game";
import { SLOT_ORDER } from "@/data/materials";

const ids = <S extends SlotKey>(slot: S) => MATERIALS_BY_SLOT[slot].map((m) => m.id) as MaterialId[];

const slotList = (slot: SlotKey) =>
  z.array(z.string()).superRefine((list, ctx) => {
    list.forEach((value, i) => {
      if (!isMaterialForSlot(slot, value)) {
        ctx.addIssue({ code: "custom", path: [i], message: `"${value}" không thuộc lớp ${slot}` });
      }
    });
  });

const combination = z.object({ core: slotList("core"), surface: slotList("surface"), edge: slotList("edge") });
const effect = z.enum(["BULGING_EDGES", "SCRATCHED", "PERFECT_GLOSS", "WARPING"]);

const scenarioSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  level: z.number().int().positive(),
  title: z.string().min(3),
  zone: z.enum(["KITCHEN_SINK", "BEDROOM_KIDS", "LIVING_WALL"]),
  customerDemand: z.string().min(20),
  budgetTier: z.enum(["BUDGET", "STANDARD", "PREMIUM"]),
  idealCombination: combination,
  acceptableCombination: combination,
  technicalRules: z.object({
    forbiddenCores: slotList("core"),
    forbiddenEffect: effect.optional(),
    warningMessage: z.string().optional(),
    perfectExplanation: z.string().min(20),
  }),
  penaltyRules: z.array(
    z.object({
      id: z.string(),
      when: combination.partial(),
      penalty: z.number().min(0),
      visualEffect: effect,
      message: z.string().min(10),
      capScore: z.number().min(0).max(100).optional(),
    }),
  ),
  expertTip: z.string().min(10),
  budgetNote: z.string().optional(),
});

/** Mọi tổ hợp (cốt × bề mặt × nẹp) cho tổ hợp danh sách. */
function cartesian(lists: { core: MaterialId[]; surface: MaterialId[]; edge: MaterialId[] }) {
  const out: { core: MaterialId; surface: MaterialId; edge: MaterialId }[] = [];
  for (const core of lists.core) for (const surface of lists.surface) for (const edge of lists.edge) out.push({ core, surface, edge });
  return out;
}

describe("catalog vật liệu", () => {
  it("đủ 5 cốt / 4 bề mặt / 3 nẹp, id không trùng, mô tả & tag không rỗng", () => {
    expect(MATERIALS_BY_SLOT.core).toHaveLength(5);
    expect(MATERIALS_BY_SLOT.surface).toHaveLength(4);
    expect(MATERIALS_BY_SLOT.edge).toHaveLength(3);
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
    for (const m of MATERIALS) {
      expect(m.description.length).toBeGreaterThan(20);
      expect(m.specTags.length).toBeGreaterThan(0);
      expect(MATERIALS_BY_SLOT[m.slot].some((x) => x.id === m.id)).toBe(true);
    }
  });

  it("tổng trọng số các lớp = 100", () => {
    expect(SLOT_ORDER.reduce((s, slot) => s + SLOT_WEIGHTS[slot], 0)).toBe(100);
  });
});

describe.each(SCENARIOS.map((s) => [s.id, s] as const))("scenario %s — toàn vẹn dữ liệu", (_id, s: RoomScenario) => {
  it("đúng shape (id vật liệu hợp lệ theo từng lớp)", () => {
    const parsed = scenarioSchema.safeParse(s);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("ideal / acceptable / forbidden không chồng lấn", () => {
    for (const slot of SLOT_ORDER) {
      const ideal = s.idealCombination[slot] as MaterialId[];
      const acceptable = s.acceptableCombination[slot] as MaterialId[];
      expect(ideal.length, `${slot} phải có ít nhất 1 lựa chọn ideal`).toBeGreaterThan(0);
      expect(ideal.filter((x) => acceptable.includes(x))).toEqual([]);
    }
    const forbidden = s.technicalRules.forbiddenCores as MaterialId[];
    expect((s.idealCombination.core as MaterialId[]).filter((x) => forbidden.includes(x))).toEqual([]);
    expect((s.acceptableCombination.core as MaterialId[]).filter((x) => forbidden.includes(x))).toEqual([]);
  });

  it("luật trừ điểm: id không trùng, có ít nhất 1 slot, penalty > 0", () => {
    const seen = new Set<string>();
    for (const rule of s.penaltyRules) {
      expect(seen.has(rule.id)).toBe(false);
      seen.add(rule.id);
      expect(SLOT_ORDER.some((slot) => (rule.when[slot]?.length ?? 0) > 0)).toBe(true);
      expect(rule.penalty).toBeGreaterThan(0);
    }
  });

  it("màn có cốt bị cấm thì phải có warningMessage", () => {
    if (s.technicalRules.forbiddenCores.length > 0) {
      expect(s.technicalRules.warningMessage).toBeTruthy();
    }
  });

  it("màn ngân sách BUDGET phải có budgetNote", () => {
    if (BUDGET_RULES[s.budgetTier]) expect(s.budgetNote).toBeTruthy();
  });

  it("MỌI tổ hợp ideal đạt đúng 100 điểm, PERFECT_GLOSS, không dính phạt hay quá tay", () => {
    const combos = cartesian({
      core: s.idealCombination.core as MaterialId[],
      surface: s.idealCombination.surface as MaterialId[],
      edge: s.idealCombination.edge as MaterialId[],
    });
    for (const c of combos) {
      const r = evaluateChoice(s, c as never);
      expect(r, JSON.stringify(c)).toMatchObject({ score: 100, status: "PERFECT", visualEffect: "PERFECT_GLOSS", overspent: false });
      expect(r.penalties).toEqual([]);
    }
  });

  it("cân bằng độ khó: có combo FAIL, có combo PERFECT; cốt bị cấm không bao giờ qua PASS", () => {
    const all = cartesian({ core: ids("core"), surface: ids("surface"), edge: ids("edge") });
    const results = all.map((c) => ({ c, r: evaluateChoice(s, c as never) }));
    expect(results.some(({ r }) => r.status === "FAIL")).toBe(true);
    expect(results.some(({ r }) => r.status === "PERFECT")).toBe(true);
    // PERFECT chỉ được đạt khi cốt là ideal.
    for (const { c, r } of results) {
      if (r.status === "PERFECT") expect(s.idealCombination.core as MaterialId[]).toContain(c.core);
      if ((s.technicalRules.forbiddenCores as MaterialId[]).includes(c.core)) expect(r.status).toBe("FAIL");
    }
  });
});

describe("danh sách SCENARIOS", () => {
  it("3 màn, level liên tục 1..n, id duy nhất, đúng thứ tự", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["sink_cabinet", "kids_bedroom", "living_wall"]);
    expect(SCENARIOS.map((s) => s.level)).toEqual([1, 2, 3]);
    expect(new Set(SCENARIOS.map((s) => s.zone)).size).toBe(3);
  });
});
