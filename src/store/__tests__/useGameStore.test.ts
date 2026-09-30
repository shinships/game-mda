import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCENARIOS } from "@/data/scenarios";
import type { GamePhase, LeadFormValues, LeadSubmitOutcome, PlayerSelection } from "@/types/game";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/leadClient", () => ({ submitLeadRequest: vi.fn() }));

import { track } from "@/lib/analytics";
import { submitLeadRequest } from "@/lib/leadClient";
import {
  GAME_STORAGE_KEY,
  selectAverageScore,
  selectCanTest,
  selectCurrentResult,
  selectCurrentScenario,
  selectCurrentSelection,
  selectRank,
  selectTotalScore,
  hydrateGameStore,
  useGameStore,
} from "@/store/useGameStore";

const mockTrack = vi.mocked(track);
const mockSubmit = vi.mocked(submitLeadRequest);
const s = () => useGameStore.getState();

/** Lựa chọn ideal cho từng màn, theo thứ tự level. */
const IDEAL: PlayerSelection[] = [
  { core: "PVC_WPB", surface: "ACRYLIC", edge: "PUR_NOLINE" },
  { core: "MDF_MOISTURE_RESISTANT", surface: "MELAMINE", edge: "EVA_STANDARD" },
  { core: "HDF_COMPACT", surface: "VENEER", edge: "PUR_NOLINE" },
];
/** Lựa chọn tệ cho từng màn (cốt bị cấm/không hợp). */
const BAD: PlayerSelection[] = [
  { core: "MFC_STANDARD", surface: "VENEER", edge: "EVA_STANDARD" },
  { core: "MFC_STANDARD", surface: "ACRYLIC", edge: "ALUMINUM_FRAME" },
  { core: "MFC_STANDARD", surface: "MELAMINE", edge: "EVA_STANDARD" },
];

const FORM: LeadFormValues = { name: "Nguyễn Văn A", phone: "0912 345 678", project: "Căn hộ 2PN", consent: true };
const SUCCESS: LeadSubmitOutcome = {
  ok: true,
  voucherCode: "MDA-KTS-ABC234",
  rank: { id: "KTS_THONG_THAI", title: "KTS Thông Thái" },
  voucherValue: 5_000_000,
  voucherLabel: "5.000.000đ",
  averageScore: 100,
  zaloUrl: "https://zalo.me/test",
};

function pickAll(sel: PlayerSelection) {
  s().select("core", sel.core!);
  s().select("surface", sel.surface!);
  s().select("edge", sel.edge!);
}
/** Chọn → kiểm định → xem kết quả → sang màn kế (hoặc SUMMARY ở màn cuối). */
function playLevel(sel: PlayerSelection) {
  pickAll(sel);
  s().runTest();
  s().finishTest();
  s().next();
}
function playAll(choices: PlayerSelection[]) {
  s().start();
  choices.forEach(playLevel);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  useGameStore.setState({ utm: {} });
  s().reset();
  vi.unstubAllGlobals();
});

describe("trạng thái ban đầu", () => {
  it("bắt đầu ở INTRO với 3 màn và chưa có dữ liệu", () => {
    expect(s()).toMatchObject({ phase: "INTRO", levelIndex: 0, totalLevels: 3, selections: {}, results: {}, voucher: null });
    expect(selectCanTest(s())).toBe(false);
    expect(selectTotalScore(s())).toBe(0);
  });
});

describe("transition sai bị chặn", () => {
  const snapshotPhase = () => s().phase;

  it("ở INTRO chỉ có start() có tác dụng", () => {
    s().select("core", "PVC_WPB");
    s().runTest();
    s().finishTest();
    s().next();
    s().openLeadForm();
    expect(snapshotPhase()).toBe("INTRO");
    expect(s().selections).toEqual({});
  });

  it("submitLead ngoài LEAD_FORM/SUBMIT_ERROR trả INVALID_STATE và không gọi API", async () => {
    const outcome = await s().submitLead(FORM);
    expect(outcome).toMatchObject({ ok: false, error: "INVALID_STATE" });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(snapshotPhase()).toBe("INTRO");
  });

  it("start() lần hai không làm mất tiến trình", () => {
    s().start();
    s().select("core", "PVC_WPB");
    s().start();
    expect(s().selections.sink_cabinet?.core).toBe("PVC_WPB");
    expect(mockTrack.mock.calls.filter(([e]) => e === "game_start")).toHaveLength(1);
  });

  it("runTest() bị chặn khi chưa chọn đủ 3 lớp hoặc chưa ở SELECTING", () => {
    s().start();
    s().runTest(); // BRIEF
    expect(snapshotPhase()).toBe("BRIEF");
    s().select("core", "PVC_WPB");
    s().select("surface", "ACRYLIC");
    s().runTest(); // thiếu nẹp
    expect(snapshotPhase()).toBe("SELECTING");
    expect(s().results).toEqual({});
  });

  it("select() bỏ qua giá trị sai lớp hoặc id lạ", () => {
    s().start();
    s().select("core", "ACRYLIC"); // bề mặt đặt vào lớp cốt
    s().select("edge", "GOLD" as never);
    s().select("wheel" as never, "PVC_WPB");
    expect(s().selections).toEqual({});
    expect(snapshotPhase()).toBe("BRIEF");
  });

  it("không thể chọn lại vật liệu khi đang TESTING/RESULT", () => {
    s().start();
    pickAll(IDEAL[0]);
    s().runTest();
    s().select("core", "MFC_STANDARD");
    expect(selectCurrentSelection(s()).core).toBe("PVC_WPB");
    s().finishTest();
    s().select("core", "MFC_STANDARD");
    expect(selectCurrentSelection(s()).core).toBe("PVC_WPB");
  });

  it("next() chỉ đi tiếp từ BRIEF hoặc RESULT; openLeadForm chỉ từ SUMMARY/SUBMIT_ERROR", () => {
    s().start();
    pickAll(IDEAL[0]); // SELECTING
    s().next();
    s().openLeadForm();
    expect(snapshotPhase()).toBe("SELECTING");
    s().runTest();
    s().next(); // TESTING → không được bỏ qua finishTest
    expect(snapshotPhase()).toBe("TESTING");
  });
});

describe("đi hết luồng 3 màn", () => {
  it("đi đúng chuỗi phase INTRO → … → SUMMARY → LEAD_FORM → SUBMITTING → SUCCESS", async () => {
    const seen: GamePhase[] = [s().phase];
    useGameStore.subscribe((st) => {
      if (seen[seen.length - 1] !== st.phase) seen.push(st.phase);
    });
    mockSubmit.mockResolvedValue(SUCCESS);

    playAll(IDEAL);
    s().openLeadForm();
    await s().submitLead(FORM);

    const level: GamePhase[] = ["BRIEF", "SELECTING", "TESTING", "RESULT"];
    expect(seen).toEqual([
      "INTRO",
      ...level,
      ...level,
      ...level,
      "SUMMARY",
      "LEAD_FORM",
      "SUBMITTING",
      "SUCCESS",
    ]);
  });

  it("tổng điểm, điểm TB và rank đúng khi chơi hoàn hảo", () => {
    playAll(IDEAL);
    expect(s().phase).toBe("SUMMARY");
    expect(SCENARIOS.map((sc) => s().results[sc.id].score)).toEqual([100, 100, 100]);
    expect(selectTotalScore(s())).toBe(300);
    expect(selectAverageScore(s())).toBe(100);
    expect(selectRank(s())).toMatchObject({ id: "KTS_THONG_THAI", voucherValue: 5_000_000 });
    expect(s().finishedAt).not.toBeNull();
  });

  it("chơi tệ → rank thấp nhất, mỗi màn vẫn có kết quả", () => {
    playAll(BAD);
    expect(s().phase).toBe("SUMMARY");
    expect(selectAverageScore(s())).toBeLessThan(50);
    expect(selectRank(s()).id).toBe("HOC_VIEC_TRIEN_VONG");
  });

  it("selectors theo dõi đúng màn hiện tại và trạng thái nút Kiểm định", () => {
    s().start();
    expect(selectCurrentScenario(s()).id).toBe("sink_cabinet");
    expect(selectCanTest(s())).toBe(false);
    s().select("core", "PVC_WPB");
    s().select("surface", "ACRYLIC");
    expect(selectCanTest(s())).toBe(false);
    s().select("edge", "PUR_NOLINE");
    expect(selectCanTest(s())).toBe(true);
    expect(selectCurrentResult(s())).toBeNull();
    s().runTest();
    expect(selectCanTest(s())).toBe(false);
    expect(selectCurrentResult(s())).toMatchObject({ score: 100, visualEffect: "PERFECT_GLOSS" });
    s().finishTest();
    s().next();
    expect(selectCurrentScenario(s()).id).toBe("kids_bedroom");
    expect(selectCurrentSelection(s())).toEqual({ core: null, surface: null, edge: null });
  });

  it("đổi lựa chọn trước khi kiểm định thì dùng lựa chọn cuối cùng", () => {
    s().start();
    pickAll(BAD[0]);
    s().select("core", "PVC_WPB");
    s().select("surface", "ACRYLIC");
    s().select("edge", "PUR_NOLINE");
    s().runTest();
    expect(selectCurrentResult(s())?.score).toBe(100);
  });

  it("reset() ở mọi phase đưa về INTRO, xoá tiến trình nhưng giữ utm", () => {
    useGameStore.setState({ utm: { utm_source: "facebook" } });
    playAll(IDEAL);
    s().reset();
    expect(s()).toMatchObject({ phase: "INTRO", levelIndex: 0, selections: {}, results: {}, finishedAt: null, utm: { utm_source: "facebook" } });
  });
});

describe("tracking", () => {
  it("bắn game_start, level_complete ×3, game_complete và Lead đúng lúc", async () => {
    mockSubmit.mockResolvedValue(SUCCESS);
    playAll(IDEAL);
    s().openLeadForm();
    await s().submitLead(FORM);
    const events = mockTrack.mock.calls.map(([e]) => e);
    expect(events).toEqual(["game_start", "level_complete", "level_complete", "level_complete", "game_complete", "Lead"]);
    expect(mockTrack).toHaveBeenCalledWith("game_complete", { total_score: 300, average_score: 100, rank: "KTS_THONG_THAI" });
  });

  it("không đưa tên/SĐT vào tracking", async () => {
    mockSubmit.mockResolvedValue(SUCCESS);
    playAll(IDEAL);
    s().openLeadForm();
    await s().submitLead(FORM);
    const serialized = JSON.stringify(mockTrack.mock.calls);
    expect(serialized).not.toContain("Nguyễn");
    expect(serialized).not.toContain("0912");
  });

  it("chỉ bắn level_complete khi chấm thật sự (không bắn khi runTest bị chặn)", () => {
    s().start();
    s().runTest();
    expect(mockTrack.mock.calls.filter(([e]) => e === "level_complete")).toHaveLength(0);
  });
});

describe("UTM", () => {
  it("bắt UTM/click-id từ URL khi start() và gửi kèm khi submit", async () => {
    vi.stubGlobal("window", { location: { search: "?utm_source=facebook&utm_campaign=tet&fbclid=xyz&foo=bar" } });
    mockSubmit.mockResolvedValue(SUCCESS);
    playAll(IDEAL);
    expect(s().utm).toEqual({ utm_source: "facebook", utm_campaign: "tet", fbclid: "xyz" });
    s().openLeadForm();
    await s().submitLead(FORM);
    expect(mockSubmit.mock.calls[0][0].utm).toEqual({ utm_source: "facebook", utm_campaign: "tet", fbclid: "xyz" });
  });
});

describe("submitLead", () => {
  function toLeadForm() {
    playAll(IDEAL);
    s().openLeadForm();
  }

  it("thành công → SUCCESS, lưu voucher; payload có đủ selections + điểm tham khảo", async () => {
    toLeadForm();
    mockSubmit.mockResolvedValue(SUCCESS);
    const outcome = await s().submitLead(FORM);
    expect(outcome).toEqual(SUCCESS);
    expect(s()).toMatchObject({ phase: "SUCCESS", voucher: SUCCESS, submitError: null });

    const payload = mockSubmit.mock.calls[0][0];
    expect(Object.keys(payload.selections)).toEqual(SCENARIOS.map((sc) => sc.id));
    expect(payload.selections.sink_cabinet).toEqual(IDEAL[0]);
    expect(payload).toMatchObject({ name: "Nguyễn Văn A", phone: "0912 345 678", consent: true, clientScore: 100 });
    expect(typeof payload.durationMs).toBe("number");
  });

  it("lỗi mạng/server → SUBMIT_ERROR kèm thông báo; thử lại thành công → SUCCESS", async () => {
    toLeadForm();
    mockSubmit.mockResolvedValueOnce({ ok: false, error: "NETWORK", message: "Mất mạng" });
    const failed = await s().submitLead(FORM);
    expect(failed.ok).toBe(false);
    expect(s()).toMatchObject({ phase: "SUBMIT_ERROR", submitError: "Mất mạng", voucher: null });

    mockSubmit.mockResolvedValueOnce(SUCCESS);
    await s().submitLead(FORM);
    expect(s()).toMatchObject({ phase: "SUCCESS", submitError: null });
    expect(mockTrack.mock.calls.filter(([e]) => e === "Lead")).toHaveLength(1);
  });

  it("SUBMIT_ERROR → openLeadForm() quay lại form và xoá thông báo lỗi", async () => {
    toLeadForm();
    mockSubmit.mockResolvedValue({ ok: false, error: "UPSTREAM", message: "Bận" });
    await s().submitLead(FORM);
    s().openLeadForm();
    expect(s()).toMatchObject({ phase: "LEAD_FORM", submitError: null });
  });

  it("form không hợp lệ → trả VALIDATION, KHÔNG đổi phase, KHÔNG gọi API", async () => {
    toLeadForm();
    const outcome = await s().submitLead({ ...FORM, phone: "12345", consent: false });
    expect(outcome).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(outcome.ok === false && outcome.fieldErrors?.phone).toBeTruthy();
    expect(s().phase).toBe("LEAD_FORM");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("không double-submit khi đang SUBMITTING", async () => {
    toLeadForm();
    let release!: (o: LeadSubmitOutcome) => void;
    mockSubmit.mockReturnValue(new Promise<LeadSubmitOutcome>((r) => (release = r)));
    const first = s().submitLead(FORM);
    expect(s().phase).toBe("SUBMITTING");
    const second = await s().submitLead(FORM);
    expect(second).toMatchObject({ ok: false, error: "INVALID_STATE" });
    release(SUCCESS);
    await first;
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("reset() trong lúc chờ server → kết quả muộn bị bỏ qua", async () => {
    toLeadForm();
    let release!: (o: LeadSubmitOutcome) => void;
    mockSubmit.mockReturnValue(new Promise<LeadSubmitOutcome>((r) => (release = r)));
    const pending = s().submitLead(FORM);
    s().reset();
    release(SUCCESS);
    await pending;
    expect(s()).toMatchObject({ phase: "INTRO", voucher: null });
  });
});

/** Giả lập tải lại trang: RAM trống nhưng sessionStorage còn nguyên (không để persist ghi đè bản đã lưu). */
async function simulateReload() {
  const stored = sessionStorage.getItem(GAME_STORAGE_KEY);
  useGameStore.setState({ phase: "INTRO", selections: {}, results: {}, levelIndex: 0, startedAt: null, finishedAt: null, voucher: null });
  if (stored) sessionStorage.setItem(GAME_STORAGE_KEY, stored);
  await useGameStore.persist.rehydrate();
}

describe("persist (sessionStorage)", () => {
  it("lưu tiến trình, KHÔNG lưu tên/SĐT, và khôi phục sau khi 'tải lại trang'", async () => {
    mockSubmit.mockResolvedValue({ ok: false, error: "NETWORK", message: "x" });
    playAll(IDEAL);
    s().openLeadForm();
    await s().submitLead(FORM);

    const stored = sessionStorage.getItem(GAME_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).not.toContain("Nguyễn");
    expect(stored).not.toContain("0912");
    expect(stored).not.toContain("consent");

    await simulateReload();

    expect(s().phase).toBe("LEAD_FORM"); // SUBMIT_ERROR (đang dở) → về LEAD_FORM
    expect(s().selections.sink_cabinet).toEqual(IDEAL[0]);
    expect(selectTotalScore(s())).toBe(300); // results tính lại từ selections
  });

  it("khôi phục giữa chừng ở màn 2 đang chọn dở", async () => {
    s().start();
    playLevel(IDEAL[0]);
    s().select("core", "MDF_MOISTURE_RESISTANT");
    await simulateReload();
    expect(s()).toMatchObject({ phase: "SELECTING", levelIndex: 1 });
    expect(Object.keys(s().results)).toEqual(["sink_cabinet"]);
    expect(selectCurrentSelection(s()).core).toBe("MDF_MOISTURE_RESISTANT");
  });

  it("dữ liệu lưu bị hỏng → bỏ qua, giữ trạng thái mới", async () => {
    sessionStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({ state: { phase: "SUCCESS", levelIndex: 99 }, version: 1 }));
    await useGameStore.persist.rehydrate();
    expect(s().phase).toBe("INTRO");
  });
});

describe("hydrateGameStore", () => {
  it("bật hasHydrated sau khi nạp, gọi nhiều lần vẫn an toàn và reset() không làm mất cờ", async () => {
    expect(s().hasHydrated).toBe(false);
    await Promise.all([hydrateGameStore(), hydrateGameStore()]);
    expect(s().hasHydrated).toBe(true);
    s().reset();
    expect(s().hasHydrated).toBe(true);
  });
});
