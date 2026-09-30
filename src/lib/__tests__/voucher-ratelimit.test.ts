import { describe, expect, it } from "vitest";
import { RANKS } from "@/data/ranks";
import { createRateLimiter } from "@/lib/rateLimit";
import { generateVoucherCode, VOUCHER_ALPHABET } from "@/lib/voucher";

describe("generateVoucherCode", () => {
  it("đúng định dạng MDA-<TIER>-<6 ký tự> cho từng rank", () => {
    for (const rank of RANKS) {
      expect(generateVoucherCode(rank)).toMatch(new RegExp(`^MDA-${rank.voucherCodePart}-[A-Z0-9]{6}$`));
    }
  });

  it("không dùng ký tự dễ nhầm I, O, 0, 1", () => {
    expect(VOUCHER_ALPHABET).not.toMatch(/[IO01]/);
    const codes = Array.from({ length: 500 }, () => generateVoucherCode(RANKS[0]).slice(-6));
    expect(codes.join("")).not.toMatch(/[IO01]/);
  });

  it("ngẫu nhiên: 2000 mã không trùng nhau", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateVoucherCode(RANKS[0])));
    expect(codes.size).toBe(2000);
  });

  it("dùng nguồn random được truyền vào (để test xác định)", () => {
    const seq = [0, 1, 2, 3, 4, 5];
    let i = 0;
    expect(generateVoucherCode(RANKS[1], () => seq[i++])).toBe("MDA-THO-ABCDEF");
  });
});

describe("createRateLimiter", () => {
  it("cho phép tới `limit` lượt rồi chặn, kèm số giây chờ", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const t0 = 1_000_000;
    expect(rl.check("ip", t0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(rl.check("ip", t0 + 1000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(rl.check("ip", t0 + 2000)).toMatchObject({ allowed: true, remaining: 0 });
    const blocked = rl.check("ip", t0 + 10_000);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(blocked.retryAfterSec).toBe(50); // lượt đầu hết hạn sau 60s − 10s
  });

  it("cho phép lại khi lượt cũ ra khỏi cửa sổ", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("ip", 0).allowed).toBe(true);
    expect(rl.check("ip", 999).allowed).toBe(false);
    expect(rl.check("ip", 1000).allowed).toBe(true);
  });

  it("các key độc lập; lượt bị chặn không kéo dài thời gian chờ", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 500).allowed).toBe(false);
    expect(rl.check("a", 1000).allowed).toBe(true);
  });

  it("giới hạn số key được nhớ (loại key cũ nhất)", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    rl.check("a", 0);
    rl.check("b", 0);
    rl.check("c", 0); // đẩy "a" ra
    expect(rl.check("a", 1).allowed).toBe(true); // "a" đã bị quên
    expect(rl.check("c", 1).allowed).toBe(false);
  });
});
