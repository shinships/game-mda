import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "@/lib/analytics";
import { ALL_PHASES, canTransition, PHASE_TRANSITIONS } from "@/lib/gameFlow";
import { mergeUtm, parseUtm, sanitizeUtm } from "@/lib/utm";

describe("gameFlow", () => {
  it("luồng chính hợp lệ", () => {
    const path = ["INTRO", "BRIEF", "SELECTING", "TESTING", "RESULT", "SUMMARY", "LEAD_FORM", "SUBMITTING", "SUCCESS"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i], path[i + 1])).toBe(true);
    expect(canTransition("RESULT", "BRIEF")).toBe(true); // sang màn kế
    expect(canTransition("SUBMITTING", "SUBMIT_ERROR")).toBe(true);
    expect(canTransition("SUBMIT_ERROR", "SUBMITTING")).toBe(true);
  });

  it("chặn nhảy cóc & đi ngược", () => {
    expect(canTransition("INTRO", "SELECTING")).toBe(false);
    expect(canTransition("SELECTING", "RESULT")).toBe(false); // phải qua TESTING
    expect(canTransition("RESULT", "LEAD_FORM")).toBe(false); // phải qua SUMMARY
    expect(canTransition("SUMMARY", "SUBMITTING")).toBe(false);
    expect(canTransition("SUCCESS", "LEAD_FORM")).toBe(false);
    expect(canTransition("TESTING", "SELECTING")).toBe(false);
  });

  it("mọi phase có mặt trong bảng và mọi đích đều là phase hợp lệ", () => {
    for (const from of ALL_PHASES) for (const to of PHASE_TRANSITIONS[from]) expect(ALL_PHASES).toContain(to);
    expect(ALL_PHASES).toHaveLength(10);
  });
});

describe("utm", () => {
  it("parse UTM và click-id, bỏ tham số lạ", () => {
    expect(parseUtm("?utm_source=facebook&utm_medium=cpc&gclid=g1&other=1")).toEqual({
      utm_source: "facebook",
      utm_medium: "cpc",
      gclid: "g1",
    });
    expect(parseUtm("")).toEqual({});
  });

  it("sanitize: cắt 200 ký tự, bỏ ký tự điều khiển và giá trị rỗng/không phải chuỗi", () => {
    const out = sanitizeUtm({ utm_source: `a\u0000b\n${"x".repeat(500)}`, utm_medium: "  ", utm_term: 5 });
    expect(out.utm_source).toHaveLength(200);
    expect(out.utm_source?.startsWith("ab")).toBe(true);
    expect(out).not.toHaveProperty("utm_medium");
    expect(out).not.toHaveProperty("utm_term");
    expect(sanitizeUtm(null)).toEqual({});
  });

  it("merge: giá trị mới ghi đè, khoá không có giữ nguyên", () => {
    expect(mergeUtm({ utm_source: "a", utm_medium: "b" }, { utm_source: "c" })).toEqual({ utm_source: "c", utm_medium: "b" });
  });
});

describe("analytics.track", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("không throw khi chạy ngoài trình duyệt hoặc chưa có fbq/gtag", () => {
    expect(() => track("game_start")).not.toThrow();
    vi.stubGlobal("window", {});
    expect(() => track("Lead", { value: 1 })).not.toThrow();
  });

  it("ánh xạ sự kiện sang Meta Pixel và GA4, bỏ tham số undefined", () => {
    const fbq = vi.fn();
    const gtag = vi.fn();
    vi.stubGlobal("window", { fbq, gtag });
    track("level_complete", { score: 90, note: undefined });
    track("Lead", { value: 5 });
    expect(fbq).toHaveBeenNthCalledWith(1, "trackCustom", "level_complete", { score: 90 });
    expect(fbq).toHaveBeenNthCalledWith(2, "track", "Lead", { value: 5 });
    expect(gtag).toHaveBeenNthCalledWith(1, "event", "level_complete", { score: 90 });
    expect(gtag).toHaveBeenNthCalledWith(2, "event", "generate_lead", { value: 5 });
  });

  it("nuốt lỗi từ script tracking", () => {
    vi.stubGlobal("window", { fbq: () => { throw new Error("boom"); }, gtag: () => { throw new Error("boom"); } });
    expect(() => track("game_complete")).not.toThrow();
  });
});
