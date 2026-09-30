import { describe, expect, it } from "vitest";
import {
  isValidPhone,
  leadFormSchema,
  leadPayloadSchema,
  leadSuccessResponseSchema,
  normalizePhone,
} from "@/lib/validation/lead";

const VALID_SELECTIONS = {
  sink_cabinet: { core: "PVC_WPB", surface: "ACRYLIC", edge: "PUR_NOLINE" },
  kids_bedroom: { core: "MDF_MOISTURE_RESISTANT", surface: "MELAMINE", edge: "EVA_STANDARD" },
  living_wall: { core: "HDF_COMPACT", surface: "VENEER", edge: "PUR_NOLINE" },
};
const FORM = { name: "Nguyễn Văn A", phone: "0912345678", consent: true };

describe("normalizePhone / isValidPhone", () => {
  it.each([
    ["0912345678", "0912345678"],
    ["0912 345 678", "0912345678"],
    ["0912.345.678", "0912345678"],
    ["091-234-5678", "0912345678"],
    ["(091) 2345678", "0912345678"],
    ["+84912345678", "0912345678"],
    ["+84 912 345 678", "0912345678"],
    ["84912345678", "0912345678"],
    ["+840912345678", "0912345678"], // gõ thừa số 0 sau +84
    ["  0912345678  ", "0912345678"],
  ])("chấp nhận và chuẩn hoá %j → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
    expect(isValidPhone(input)).toBe(true);
  });

  it.each(["0332345678", "0562345678", "0762345678", "0862345678", "0962345678"])("chấp nhận đầu số di động %s", (p) => {
    expect(isValidPhone(p)).toBe(true);
  });

  it.each([
    ["rỗng", ""],
    ["chữ", "abcdefghij"],
    ["thiếu số", "091234567"],
    ["thừa số", "09123456789"],
    ["đầu số cố định 02", "0212345678"],
    ["đầu số 01 (đã bỏ)", "0112345678"],
    ["đầu số 04", "0412345678"],
    ["không có 0 đầu", "912345678"],
    ["+84 nhưng thiếu số", "+8491234567"],
    ["mã quốc gia khác", "+66912345678"],
    ["chèn ký tự lạ", "0912345678<script>"],
  ])("từ chối %s", (_name, input) => {
    expect(isValidPhone(input)).toBe(false);
  });
});

describe("leadFormSchema", () => {
  it("hợp lệ tối thiểu; project & honeypot là tuỳ chọn", () => {
    expect(leadFormSchema.safeParse(FORM).success).toBe(true);
    expect(leadFormSchema.safeParse({ ...FORM, project: "Căn hộ 2PN Vinhomes", website: "" }).success).toBe(true);
  });

  it("tên: 2–50 ký tự sau khi trim", () => {
    expect(leadFormSchema.safeParse({ ...FORM, name: "A" }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...FORM, name: " A " }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...FORM, name: "An" }).success).toBe(true);
    expect(leadFormSchema.safeParse({ ...FORM, name: "a".repeat(50) }).success).toBe(true);
    expect(leadFormSchema.safeParse({ ...FORM, name: "a".repeat(51) }).success).toBe(false);
  });

  it("từ chối SĐT sai, chưa đồng ý, dự án quá dài — thông báo tiếng Việt theo field", () => {
    const r = leadFormSchema.safeParse({ name: "A", phone: "123", consent: false, project: "x".repeat(201) });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toEqual(expect.arrayContaining(["name", "phone", "consent", "project"]));
      expect(r.error.issues.find((i) => i.path[0] === "phone")?.message).toMatch(/số điện thoại/i);
    }
  });

  it("giữ nguyên giá trị người dùng nhập (không transform) để dùng với React Hook Form", () => {
    const r = leadFormSchema.parse({ ...FORM, phone: "0912 345 678", name: "  Lan  " });
    expect(r.phone).toBe("0912 345 678");
    expect(r.name).toBe("Lan"); // chỉ trim
  });
});

describe("leadPayloadSchema", () => {
  const base = { ...FORM, selections: VALID_SELECTIONS };

  it("chuẩn hoá SĐT và biến project rỗng thành undefined", () => {
    const r = leadPayloadSchema.parse({ ...base, phone: "+84 912 345 678", project: "" });
    expect(r.phone).toBe("0912345678");
    expect(r.project).toBeUndefined();
  });

  it("nhận utm/clientScore/durationMs hợp lệ, loại bỏ khoá lạ trong utm", () => {
    const r = leadPayloadSchema.parse({
      ...base,
      clientScore: 90,
      durationMs: 45_000,
      utm: { utm_source: "facebook", evil: "x" },
    });
    expect(r.utm).toEqual({ utm_source: "facebook" });
  });

  it.each([
    ["id vật liệu lạ", { sink_cabinet: { core: "GOLD", surface: "ACRYLIC", edge: "PUR_NOLINE" } }],
    ["vật liệu sai lớp", { sink_cabinet: { core: "ACRYLIC", surface: "ACRYLIC", edge: "PUR_NOLINE" } }],
    ["thiếu lớp (null)", { sink_cabinet: { core: "PVC_WPB", surface: null, edge: "PUR_NOLINE" } }],
    ["thiếu lớp (không có khoá)", { sink_cabinet: { core: "PVC_WPB", surface: "ACRYLIC" } }],
  ])("từ chối selections: %s", (_name, selections) => {
    expect(leadPayloadSchema.safeParse({ ...base, selections }).success).toBe(false);
  });

  it("từ chối điểm ngoài 0–100, thời gian chơi âm, quá nhiều màn", () => {
    expect(leadPayloadSchema.safeParse({ ...base, clientScore: 101 }).success).toBe(false);
    expect(leadPayloadSchema.safeParse({ ...base, clientScore: -1 }).success).toBe(false);
    expect(leadPayloadSchema.safeParse({ ...base, durationMs: -5 }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`s${i}`, VALID_SELECTIONS.sink_cabinet]));
    expect(leadPayloadSchema.safeParse({ ...base, selections: many }).success).toBe(false);
  });
});

describe("leadSuccessResponseSchema", () => {
  const ok = {
    ok: true,
    voucherCode: "MDA-KTS-ABC234",
    rank: { id: "KTS_THONG_THAI", title: "KTS Thông Thái" },
    voucherValue: 5_000_000,
    voucherLabel: "5.000.000đ",
    averageScore: 100,
    zaloUrl: null,
  };
  it("nhận phản hồi đúng, từ chối mã voucher/rank sai", () => {
    expect(leadSuccessResponseSchema.safeParse(ok).success).toBe(true);
    expect(leadSuccessResponseSchema.safeParse({ ...ok, voucherCode: "MDA-KTS-abc" }).success).toBe(false);
    expect(leadSuccessResponseSchema.safeParse({ ...ok, rank: { id: "VIP", title: "x" } }).success).toBe(false);
    expect(leadSuccessResponseSchema.safeParse({ ...ok, ok: false }).success).toBe(false);
  });
});
