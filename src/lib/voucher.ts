import { randomInt } from "node:crypto";
import type { RankTier } from "@/types/game";

// SERVER-ONLY. Import `node:crypto` khiến build client thất bại nếu lỡ import từ component.

/** Bỏ các ký tự dễ nhầm khi đọc/chép tay: I, O, 0, 1. */
export const VOUCHER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VOUCHER_SUFFIX_LENGTH = 6;

/**
 * Sinh mã voucher dạng `MDA-<TIER>-<6 ký tự>`, ví dụ `MDA-KTS-7H2QXM`.
 * Dùng CSPRNG (crypto.randomInt) nên không đoán được mã của người khác.
 * `random` chỉ để test.
 */
export function generateVoucherCode(
  rank: Pick<RankTier, "voucherCodePart">,
  random: (maxExclusive: number) => number = randomInt,
): string {
  let suffix = "";
  for (let i = 0; i < VOUCHER_SUFFIX_LENGTH; i++) {
    suffix += VOUCHER_ALPHABET[random(VOUCHER_ALPHABET.length)];
  }
  return `MDA-${rank.voucherCodePart}-${suffix}`;
}
