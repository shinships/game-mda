import { describe, expect, it } from "vitest";
import { restoreGame } from "@/store/restore";

const sel = (core: string, surface: string, edge: string) => ({ core, surface, edge });
const FULL = {
  sink_cabinet: sel("PVC_WPB", "ACRYLIC", "PUR_NOLINE"),
  kids_bedroom: sel("MDF_MOISTURE_RESISTANT", "MELAMINE", "EVA_STANDARD"),
  living_wall: sel("HDF_COMPACT", "VENEER", "PUR_NOLINE"),
};
const VOUCHER = {
  ok: true,
  voucherCode: "MDA-KTS-ABC234",
  rank: { id: "KTS_THONG_THAI", title: "KTS Thông Thái" },
  voucherValue: 5_000_000,
  voucherLabel: "5.000.000đ",
  averageScore: 100,
  zaloUrl: null,
};

describe("restoreGame", () => {
  it("phase đang chạy dở được đưa về phase ổn định", () => {
    expect(restoreGame({ phase: "TESTING", levelIndex: 0, selections: FULL })?.phase).toBe("RESULT");
    expect(restoreGame({ phase: "SUBMITTING", levelIndex: 2, selections: FULL })?.phase).toBe("LEAD_FORM");
    expect(restoreGame({ phase: "SUBMIT_ERROR", levelIndex: 2, selections: FULL })?.phase).toBe("LEAD_FORM");
  });

  it("chấm lại kết quả từ selections, không tin dữ liệu lưu", () => {
    const r = restoreGame({
      phase: "SUMMARY",
      levelIndex: 2,
      selections: FULL,
      results: { sink_cabinet: { score: 999 } },
    });
    expect(r?.results.sink_cabinet.score).toBe(100);
    expect(Object.keys(r!.results)).toHaveLength(3);
  });

  it("SUCCESS cần voucher hợp lệ, nếu không quay về LEAD_FORM", () => {
    expect(restoreGame({ phase: "SUCCESS", levelIndex: 2, selections: FULL, voucher: VOUCHER })?.phase).toBe("SUCCESS");
    expect(restoreGame({ phase: "SUCCESS", levelIndex: 2, selections: FULL })?.phase).toBe("LEAD_FORM");
    expect(restoreGame({ phase: "SUCCESS", levelIndex: 2, selections: FULL, voucher: { ...VOUCHER, voucherCode: "hack" } })?.phase).toBe("LEAD_FORM");
  });

  it.each([
    ["không phải object", "abc"],
    ["INTRO không cần khôi phục", { phase: "INTRO", levelIndex: 0 }],
    ["phase lạ", { phase: "HACKED", levelIndex: 0 }],
    ["levelIndex ngoài phạm vi", { phase: "SELECTING", levelIndex: 7 }],
    ["levelIndex không phải số nguyên", { phase: "SELECTING", levelIndex: 0.5 }],
    ["SUMMARY nhưng chưa ở màn cuối", { phase: "SUMMARY", levelIndex: 0, selections: FULL }],
    ["RESULT nhưng thiếu lựa chọn", { phase: "RESULT", levelIndex: 0, selections: {} }],
    ["màn trước chưa chọn đủ", { phase: "BRIEF", levelIndex: 1, selections: { sink_cabinet: { core: "PVC_WPB" } } }],
  ])("trả null khi %s", (_name, raw) => {
    expect(restoreGame(raw)).toBeNull();
  });

  it("bỏ giá trị vật liệu sai lớp; utm được làm sạch", () => {
    const r = restoreGame({
      phase: "SELECTING",
      levelIndex: 0,
      selections: { sink_cabinet: { core: "ACRYLIC", surface: "ACRYLIC", edge: 5 } },
      utm: { utm_source: " fb ", evil: "x" },
    });
    expect(r?.selections.sink_cabinet).toEqual({ core: null, surface: "ACRYLIC", edge: null });
    expect(r?.utm).toEqual({ utm_source: "fb" });
  });
});
