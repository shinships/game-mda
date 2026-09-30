import { z } from "zod";
import { MATERIALS_BY_SLOT } from "@/data/materials";
import { RANKS } from "@/data/ranks";
import type {
  CoreMaterial,
  EdgeBanding,
  LeadFormValues,
  LeadSuccessResponse,
  SurfaceMaterial,
} from "@/types/game";

/**
 * Schema dùng chung cho client (React Hook Form) và server (/api/lead).
 * Chỉ import zod + dữ liệu tĩnh nên an toàn ở cả hai phía.
 */

// --- Số điện thoại VN ---------------------------------------------------------------------------

/** Dạng chuẩn sau khi chuẩn hoá: 0 + đầu số (3|5|7|8|9) + 8 chữ số. Tương đương `^(0|\+84)(3|5|7|8|9)\d{8}$` sau khi đổi +84 → 0. */
export const PHONE_REGEX = /^0[35789]\d{8}$/;

/**
 * Chuẩn hoá SĐT về dạng 0xxxxxxxxx: bỏ khoảng trắng . - ( ) và đổi tiền tố +84 / 84 thành 0.
 * Không kiểm tra hợp lệ; kết quả có thể vẫn sai định dạng, dùng `isValidPhone` để kiểm tra.
 */
export function normalizePhone(input: string): string {
  const p = input.normalize("NFKC").replace(/[\s.\-()]/g, "");
  const intl = p.match(/^(?:\+84|84)0?(\d{9})$/);
  return intl ? `0${intl[1]}` : p;
}

export function isValidPhone(input: string): boolean {
  return PHONE_REGEX.test(normalizePhone(input));
}

// --- Form nhận quà ------------------------------------------------------------------------------

export const leadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự)")
    .max(50, "Họ tên tối đa 50 ký tự"),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại Zalo")
    .refine(isValidPhone, "Số điện thoại chưa đúng định dạng (ví dụ: 0912 345 678)"),
  project: z.string().trim().max(200, "Tối đa 200 ký tự").optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: "Vui lòng đồng ý để chúng tôi liên hệ gửi voucher và tư vấn",
  }),
  /** Honeypot: ô ẩn, người thật luôn để trống. Không hiển thị lỗi cho người dùng. */
  website: z.string().max(200).optional(),
}) satisfies z.ZodType<LeadFormValues>;

// --- Payload gửi lên server ---------------------------------------------------------------------

const enumOf = <T extends string>(items: readonly T[]) => z.enum(items as [T, ...T[]]);

const selectionSchema = z.object({
  core: enumOf(MATERIALS_BY_SLOT.core.map((m) => m.id) as CoreMaterial[]),
  surface: enumOf(MATERIALS_BY_SLOT.surface.map((m) => m.id) as SurfaceMaterial[]),
  edge: enumOf(MATERIALS_BY_SLOT.edge.map((m) => m.id) as EdgeBanding[]),
});

const utmValue = z.string().max(200).optional();
const utmSchema = z.object({
  utm_source: utmValue,
  utm_medium: utmValue,
  utm_campaign: utmValue,
  utm_term: utmValue,
  utm_content: utmValue,
  fbclid: utmValue,
  gclid: utmValue,
});

/** Payload đầy đủ. Đầu ra: SĐT đã chuẩn hoá, `project` rỗng → undefined. */
export const leadPayloadSchema = leadFormSchema.extend({
  phone: leadFormSchema.shape.phone.transform(normalizePhone),
  project: leadFormSchema.shape.project.transform((v) => v || undefined),
  selections: z.record(z.string().max(64), selectionSchema).refine((r) => Object.keys(r).length <= 10, {
    message: "Quá nhiều màn chơi",
  }),
  clientScore: z.number().min(0).max(100).optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  utm: utmSchema.optional(),
});

export type LeadPayloadParsed = z.infer<typeof leadPayloadSchema>;

// --- Phản hồi thành công của server -------------------------------------------------------------

export const leadSuccessResponseSchema = z.object({
  ok: z.literal(true),
  voucherCode: z.string().regex(/^MDA-[A-Z]{3}-[A-Z0-9]{6}$/),
  rank: z.object({
    id: enumOf(RANKS.map((r) => r.id)),
    title: z.string(),
  }),
  voucherValue: z.number().int().nonnegative(),
  voucherLabel: z.string(),
  averageScore: z.number().min(0).max(100),
  zaloUrl: z.string().nullable(),
}) satisfies z.ZodType<LeadSuccessResponse>;
