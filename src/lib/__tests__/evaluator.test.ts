import { describe, expect, it } from "vitest";
import { evaluateChoice } from "@/lib/evaluator";
import type { PenaltyRule, PlayerSelection, RoomScenario } from "@/types/game";
import { pick, scenario } from "./helpers";

const sink = scenario("sink_cabinet");
const kids = scenario("kids_bedroom");
const wall = scenario("living_wall");

describe("evaluateChoice — combo ideal", () => {
  it("sink: PVC_WPB + ACRYLIC + PUR_NOLINE → 100, PERFECT, 5 sao, PERFECT_GLOSS", () => {
    const r = evaluateChoice(sink, pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE"));
    expect(r).toMatchObject({ score: 100, stars: 5, status: "PERFECT", visualEffect: "PERFECT_GLOSS" });
    expect(r.penalties).toEqual([]);
    expect(r.overspent).toBe(false);
    expect(r.breakdown.map((b) => b.verdict)).toEqual(["IDEAL", "IDEAL", "IDEAL"]);
    expect(r.feedback.headline).toBe("Phối Vật Liệu Đạt Chuẩn KTS");
    expect(r.feedback.explanation).toBe(sink.technicalRules.perfectExplanation);
    expect(r.feedback.expertTip).toBe(sink.expertTip);
  });

  it("kids: MDF + MELAMINE + EVA (đều ideal) → 100", () => {
    expect(evaluateChoice(kids, pick("MDF_MOISTURE_RESISTANT", "MELAMINE", "EVA_STANDARD")).score).toBe(100);
  });

  it("wall: HDF + VENEER + PUR → 100", () => {
    expect(evaluateChoice(wall, pick("HDF_COMPACT", "VENEER", "PUR_NOLINE")).score).toBe(100);
  });
});

describe("evaluateChoice — cốt bị cấm", () => {
  it("sink: MFC dù bề mặt & nẹp ideal → FAIL, BULGING_EDGES, bị chặn trần 40", () => {
    const r = evaluateChoice(sink, pick("MFC_STANDARD", "LAMINATE", "PUR_NOLINE"));
    expect(r.status).toBe("FAIL");
    expect(r.visualEffect).toBe("BULGING_EDGES");
    expect(r.score).toBe(40);
    expect(r.stars).toBe(2);
    expect(r.breakdown[0]).toMatchObject({ slot: "core", verdict: "FORBIDDEN", points: 0 });
    expect(r.feedback.headline).toBe("Cảnh Báo Rủi Ro Vật Liệu!");
    expect(r.feedback.explanation).toContain(sink.technicalRules.warningMessage);
    expect(r.feedback.expertTip).toBe(sink.technicalRules.perfectExplanation);
  });

  it("sink: MFC + ACRYLIC + EVA (cộng dồn lỗi) → điểm rất thấp, 1 sao", () => {
    const r = evaluateChoice(sink, pick("MFC_STANDARD", "ACRYLIC", "EVA_STANDARD"));
    expect(r.score).toBe(8);
    expect(r.stars).toBe(1);
    expect(r.status).toBe("FAIL");
    expect(r.penalties.map((p) => p.id)).toEqual(["sink_eva_edge"]);
  });

  it("wall: MFC → FAIL với hiệu ứng WARPING (forbiddenEffect riêng của màn)", () => {
    const r = evaluateChoice(wall, pick("MFC_STANDARD", "ACRYLIC", "PUR_NOLINE"));
    expect(r).toMatchObject({ status: "FAIL", visualEffect: "WARPING", score: 40 });
  });
});

describe("evaluateChoice — nẹp/bề mặt không hợp khu vực", () => {
  it("sink: EVA ở khoang chậu rửa → trừ điểm, BULGING_EDGES, giải thích keo EVA", () => {
    const r = evaluateChoice(sink, pick("MDF_MOISTURE_RESISTANT", "LAMINATE", "EVA_STANDARD"));
    expect(r.score).toBe(58); // 50 + 25 + 2.5 − 20 = 57.5 → 58
    expect(r.status).toBe("PASS");
    expect(r.visualEffect).toBe("BULGING_EDGES");
    expect(r.feedback.explanation).toContain("Keo EVA");
    expect(r.feedback.expertTip).toBe(sink.technicalRules.perfectExplanation);
  });

  it("sink: Veneer kỵ ẩm → BULGING_EDGES", () => {
    const r = evaluateChoice(sink, pick("PVC_WPB", "VENEER", "PUR_NOLINE"));
    expect(r.visualEffect).toBe("BULGING_EDGES");
    expect(r.penalties.map((p) => p.id)).toEqual(["sink_veneer_surface"]);
  });

  it("kids: Acrylic dễ xước → SCRATCHED", () => {
    const r = evaluateChoice(kids, pick("MDF_MOISTURE_RESISTANT", "ACRYLIC", "EVA_STANDARD")); // chi phí 6, không quá tay
    expect(r.score).toBe(63); // 50 + 2.5 + 25 − 15 = 62.5 → 63
    expect(r.visualEffect).toBe("SCRATCHED");
    expect(r.status).toBe("PASS");
    expect(r.overspent).toBe(false);
  });

  it("kids: Acrylic + nẹp PUR vừa dính luật Acrylic vừa quá tay → trừ cộng dồn", () => {
    const r = evaluateChoice(kids, pick("MDF_MOISTURE_RESISTANT", "ACRYLIC", "PUR_NOLINE")); // chi phí 8 > 7
    expect(r.overspent).toBe(true);
    expect(r.score).toBe(58); // 62.5 − 5 = 57.5 → 58
  });

  it("wall: PVC/WPB giãn nở nhiệt → WARPING", () => {
    const r = evaluateChoice(wall, pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE"));
    expect(r).toMatchObject({ score: 65, status: "PASS", visualEffect: "WARPING" });
  });
});

describe("evaluateChoice — lựa chọn acceptable / trung tính", () => {
  it("sink: HDF (acceptable) + LAMINATE + PUR → 75, PASS, 4 sao, SCRATCHED, giải thích chưa tối ưu", () => {
    const r = evaluateChoice(sink, pick("HDF_COMPACT", "LAMINATE", "PUR_NOLINE"));
    expect(r).toMatchObject({ score: 75, stars: 4, status: "PASS", visualEffect: "SCRATCHED" });
    expect(r.breakdown[0].verdict).toBe("ACCEPTABLE");
    expect(r.feedback.explanation).toContain("chưa phải lựa chọn tối ưu");
    expect(r.feedback.expertTip).toBe(sink.technicalRules.perfectExplanation);
  });

  it("wall: Melamine (trung tính) làm điểm tụt khỏi PERFECT dù cốt & nẹp ideal", () => {
    const r = evaluateChoice(wall, pick("HDF_COMPACT", "MELAMINE", "PUR_NOLINE"));
    expect(r.score).toBe(78); // 50 + 2.5 + 25 = 77.5 → 78
    expect(r.status).toBe("PASS");
    expect(r.breakdown[1].verdict).toBe("NEUTRAL");
  });
});

describe("evaluateChoice — ngân sách (budgetTier)", () => {
  it("BUDGET: chọn quá tay bị trừ nhẹ 5 điểm và có budgetNote", () => {
    const over = evaluateChoice(kids, pick("HDF_COMPACT", "LAMINATE", "PUR_NOLINE")); // cost 3+2+3 = 8 > 7
    const fit = evaluateChoice(kids, pick("HDF_COMPACT", "LAMINATE", "EVA_STANDARD")); // cost 6
    expect(over.overspent).toBe(true);
    expect(over.budgetNote).toBe(kids.budgetNote);
    expect(over.feedback.explanation).toContain("vượt mức đầu tư");
    expect(fit.overspent).toBe(false);
    expect(fit.budgetNote).toBeUndefined();
    expect(fit.score - over.score).toBe(5);
  });

  it("STANDARD/PREMIUM: không bao giờ bị phạt quá tay dù chọn vật liệu đắt nhất", () => {
    expect(evaluateChoice(sink, pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE")).overspent).toBe(false);
    expect(evaluateChoice(wall, pick("PLYWOOD", "VENEER", "ALUMINUM_FRAME")).overspent).toBe(false);
  });

  it("combo ideal ở màn BUDGET không bao giờ bị coi là quá tay", () => {
    expect(evaluateChoice(kids, pick("MDF_MOISTURE_RESISTANT", "LAMINATE", "PUR_NOLINE")).overspent).toBe(false);
  });
});

describe("evaluateChoice — sao & trạng thái theo điểm (bảng biên)", () => {
  // Màn giả: combo ideal = 100, một luật trừ đúng `p` điểm → score = 100 − p.
  const withPenalty = (p: number): RoomScenario => ({
    ...sink,
    penaltyRules: [
      { id: "t", when: { core: ["PVC_WPB"] }, penalty: p, visualEffect: "SCRATCHED", message: "t" },
    ],
  });
  const ideal = pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE");

  it.each([
    [0, 100, 5, "PERFECT"],
    [10, 90, 5, "PERFECT"],
    [11, 89, 4, "PERFECT"],
    [20, 80, 4, "PERFECT"],
    [21, 79, 4, "PASS"],
    [30, 70, 4, "PASS"],
    [31, 69, 3, "PASS"],
    [50, 50, 3, "PASS"],
    [51, 49, 2, "FAIL"],
    [70, 30, 2, "FAIL"],
    [71, 29, 1, "FAIL"],
    [100, 0, 1, "FAIL"],
  ])("trừ %i → %i điểm → %i sao, %s", (penalty, score, stars, status) => {
    expect(evaluateChoice(withPenalty(penalty), ideal)).toMatchObject({ score, stars, status });
  });

  it("điểm không âm dù bị trừ vượt quá", () => {
    expect(evaluateChoice(withPenalty(500), ideal)).toMatchObject({ score: 0, stars: 1, status: "FAIL" });
  });
});

describe("evaluateChoice — luật dữ liệu", () => {
  const rule = (over: Partial<PenaltyRule>): PenaltyRule => ({
    id: "r",
    when: { edge: ["EVA_STANDARD"] },
    penalty: 0,
    visualEffect: "SCRATCHED",
    message: "m",
    ...over,
  });
  const ideal = pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE");

  it("nhiều hiệu ứng cùng kích hoạt: BULGING_EDGES > WARPING > SCRATCHED", () => {
    const s: RoomScenario = {
      ...sink,
      penaltyRules: [
        rule({ id: "a", when: { core: ["PVC_WPB"] }, penalty: 1, visualEffect: "SCRATCHED" }),
        rule({ id: "b", when: { surface: ["ACRYLIC"] }, penalty: 1, visualEffect: "WARPING" }),
      ],
    };
    expect(evaluateChoice(s, ideal).visualEffect).toBe("WARPING");
    s.penaltyRules.push(rule({ id: "c", when: { edge: ["PUR_NOLINE"] }, penalty: 1, visualEffect: "BULGING_EDGES" }));
    expect(evaluateChoice(s, ideal).visualEffect).toBe("BULGING_EDGES");
  });

  it("`when` nhiều slot: chỉ kích hoạt khi khớp tất cả; `when` rỗng không bao giờ khớp", () => {
    const s: RoomScenario = {
      ...sink,
      penaltyRules: [
        rule({ id: "and", when: { core: ["PVC_WPB"], edge: ["EVA_STANDARD"] }, penalty: 10 }),
        rule({ id: "empty", when: {}, penalty: 10 }),
      ],
    };
    expect(evaluateChoice(s, ideal).penalties).toEqual([]);
    expect(evaluateChoice(s, pick("PVC_WPB", "ACRYLIC", "EVA_STANDARD")).penalties.map((p) => p.id)).toEqual(["and"]);
  });

  it("capScore của luật giới hạn tổng điểm", () => {
    const s: RoomScenario = { ...sink, penaltyRules: [rule({ when: { core: ["PVC_WPB"] }, capScore: 30 })] };
    expect(evaluateChoice(s, ideal).score).toBe(30);
  });

  it("màn không khai báo forbiddenEffect → mặc định BULGING_EDGES", () => {
    const s: RoomScenario = {
      ...sink,
      technicalRules: { ...sink.technicalRules, forbiddenEffect: undefined },
    };
    expect(evaluateChoice(s, pick("MFC_STANDARD", "LAMINATE", "PUR_NOLINE")).visualEffect).toBe("BULGING_EDGES");
  });
});

describe("evaluateChoice — đầu vào không hợp lệ", () => {
  it.each(["core", "surface", "edge"] as const)("thiếu lớp %s → throw", (slot) => {
    const choice: PlayerSelection = { ...pick("PVC_WPB", "ACRYLIC", "PUR_NOLINE"), [slot]: null };
    expect(() => evaluateChoice(sink, choice)).toThrow(/Thiếu lựa chọn/);
  });

  it("id không thuộc đúng lớp → throw", () => {
    const bad = { core: "PVC_WPB", surface: "PUR_NOLINE", edge: "PUR_NOLINE" } as unknown as PlayerSelection;
    expect(() => evaluateChoice(sink, bad)).toThrow(/không hợp lệ/);
    const unknown = { core: "GOLD", surface: "ACRYLIC", edge: "PUR_NOLINE" } as unknown as PlayerSelection;
    expect(() => evaluateChoice(sink, unknown)).toThrow(/không hợp lệ/);
  });
});

describe("evaluateChoice — pure function", () => {
  it("cùng đầu vào cho cùng kết quả và không làm thay đổi đầu vào", () => {
    const choice = pick("MDF_MOISTURE_RESISTANT", "LAMINATE", "EVA_STANDARD");
    const scenarioBefore = structuredClone(sink);
    const choiceBefore = structuredClone(choice);
    expect(evaluateChoice(sink, choice)).toEqual(evaluateChoice(sink, choice));
    expect(sink).toEqual(scenarioBefore);
    expect(choice).toEqual(choiceBefore);
  });
});
