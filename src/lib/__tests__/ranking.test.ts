import { describe, expect, it } from "vitest";
import { RANKS } from "@/data/ranks";
import { averageScore, getRank, getRankById, summarizeScores } from "@/lib/ranking";

describe("getRank — biên điểm", () => {
  it.each([
    [100, "KTS_THONG_THAI", 5_000_000],
    [90, "KTS_THONG_THAI", 5_000_000],
    [89, "THO_CA_TINH_MAT", 3_000_000],
    [70, "THO_CA_TINH_MAT", 3_000_000],
    [69, "HOC_VIEC_TRIEN_VONG", 1_000_000],
    [0, "HOC_VIEC_TRIEN_VONG", 1_000_000],
  ])("điểm TB %i → %s (%i đ)", (avg, id, voucher) => {
    const rank = getRank(avg);
    expect(rank.id).toBe(id);
    expect(rank.voucherValue).toBe(voucher);
  });

  it("điểm lẻ được so sánh trực tiếp: 89.9 vẫn chưa đạt 90", () => {
    expect(getRank(89.9).id).toBe("THO_CA_TINH_MAT");
    expect(getRank(69.9).id).toBe("HOC_VIEC_TRIEN_VONG");
  });

  it("rank thấp nhất có cẩm nang kèm theo, các rank khác thì không", () => {
    expect(getRank(10).bonus).toMatch(/cẩm nang/i);
    expect(getRank(95).bonus).toBeUndefined();
  });
});

describe("averageScore / summarizeScores", () => {
  it("trung bình làm tròn về số nguyên", () => {
    expect(averageScore([100, 100, 100])).toBe(100);
    expect(averageScore([90, 90, 89])).toBe(90); // 89.67 → 90
    expect(averageScore([70, 70, 69])).toBe(70); // 69.67 → 70
    expect(averageScore([60, 60, 61])).toBe(60); // 60.33 → 60
    expect(averageScore([])).toBe(0);
  });

  it("summarizeScores trả tổng, trung bình và rank khớp điểm hiển thị", () => {
    const s = summarizeScores([100, 90, 80]);
    expect(s.total).toBe(270);
    expect(s.average).toBe(90);
    expect(s.rank.id).toBe("KTS_THONG_THAI");
    expect(summarizeScores([58, 63, 65]).rank.id).toBe("HOC_VIEC_TRIEN_VONG");
    expect(summarizeScores([]).rank.id).toBe("HOC_VIEC_TRIEN_VONG");
  });
});

describe("bảng RANKS", () => {
  it("sắp xếp giảm dần theo minScore, rank cuối bắt đầu từ 0, id & mã voucher không trùng", () => {
    const mins = RANKS.map((r) => r.minScore);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(mins[mins.length - 1]).toBe(0);
    expect(new Set(RANKS.map((r) => r.id)).size).toBe(RANKS.length);
    expect(new Set(RANKS.map((r) => r.voucherCodePart)).size).toBe(RANKS.length);
  });

  it("getRankById tra đúng rank", () => {
    expect(getRankById("THO_CA_TINH_MAT").title).toBe("Thợ Cả Tinh Mắt");
  });
});
