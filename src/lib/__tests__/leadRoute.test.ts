import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/webhook", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/webhook")>()),
  sendLeadToSheets: vi.fn(),
}));

import { POST } from "@/app/api/lead/route";
import { sendLeadToSheets, WebhookError } from "@/lib/webhook";

const send = vi.mocked(sendLeadToSheets);

const IDEAL = {
  sink_cabinet: { core: "PVC_WPB", surface: "ACRYLIC", edge: "PUR_NOLINE" },
  kids_bedroom: { core: "MDF_MOISTURE_RESISTANT", surface: "MELAMINE", edge: "EVA_STANDARD" },
  living_wall: { core: "HDF_COMPACT", surface: "VENEER", edge: "PUR_NOLINE" },
};
const BAD = {
  sink_cabinet: { core: "MFC_STANDARD", surface: "VENEER", edge: "EVA_STANDARD" },
  kids_bedroom: { core: "MFC_STANDARD", surface: "ACRYLIC", edge: "ALUMINUM_FRAME" },
  living_wall: { core: "MFC_STANDARD", surface: "MELAMINE", edge: "EVA_STANDARD" },
};
const FORM = { name: "Nguyễn Văn A", phone: "0912 345 678", project: "Căn hộ 2PN", consent: true };

let ipCounter = 0;
/** Mỗi test một IP riêng để bộ đếm rate limit (dùng chung trong module) không ảnh hưởng nhau. */
function post(body: unknown, headers: Record<string, string> = {}, raw = false) {
  return POST(
    new Request("http://localhost/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}`, ...headers },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  send.mockResolvedValue("sent");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/lead — luồng hợp lệ", () => {
  it("chơi hoàn hảo → rank KTS, voucher 5tr, mã đúng định dạng; ghi lead với SĐT đã chuẩn hoá", async () => {
    vi.stubEnv("NEXT_PUBLIC_ZALO_OA_URL", "https://zalo.me/mda");
    const res = await post({ ...FORM, selections: IDEAL, clientScore: 100, durationMs: 42_000, utm: { utm_source: "facebook" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      rank: { id: "KTS_THONG_THAI", title: "KTS Thông Thái" },
      voucherValue: 5_000_000,
      voucherLabel: "5.000.000đ",
      averageScore: 100,
      zaloUrl: "https://zalo.me/mda",
    });
    expect(body.voucherCode).toMatch(/^MDA-KTS-[A-Z0-9]{6}$/);

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      name: "Nguyễn Văn A",
      phone: "0912345678",
      project: "Căn hộ 2PN",
      averageScore: 100,
      levelScores: { sink_cabinet: 100, kids_bedroom: 100, living_wall: 100 },
      rankId: "KTS_THONG_THAI",
      voucherCode: body.voucherCode,
      voucherValue: 5_000_000,
      utm: { utm_source: "facebook" },
      durationMs: 42_000,
      scoreMismatch: false,
    });
  });

  it("chưa cấu hình Zalo → zaloUrl null; URL sai định dạng cũng → null", async () => {
    expect((await (await post({ ...FORM, selections: IDEAL })).json()).zaloUrl).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_ZALO_OA_URL", "javascript:alert(1)");
    expect((await (await post({ ...FORM, selections: IDEAL })).json()).zaloUrl).toBeNull();
  });
});

describe("POST /api/lead — chống gian lận điểm", () => {
  it("client báo 100 điểm nhưng chọn tệ → server vẫn cấp voucher theo điểm tự chấm và gắn cờ", async () => {
    const res = await post({ ...FORM, selections: BAD, clientScore: 100 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rank.id).toBe("HOC_VIEC_TRIEN_VONG");
    expect(body.voucherValue).toBe(1_000_000);
    expect(body.averageScore).toBeLessThan(50);
    expect(body.voucherCode).toMatch(/^MDA-HOC-/);
    expect(send.mock.calls[0][0]).toMatchObject({ scoreMismatch: true, rankId: "HOC_VIEC_TRIEN_VONG" });
  });

  it("client không gửi điểm → không bị coi là giả mạo", async () => {
    await post({ ...FORM, selections: IDEAL });
    expect(send.mock.calls[0][0].scoreMismatch).toBe(false);
  });

  it("client báo thấp hơn thực tế → server vẫn theo điểm thật (không hạ rank)", async () => {
    const body = await (await post({ ...FORM, selections: IDEAL, clientScore: 10 })).json();
    expect(body.rank.id).toBe("KTS_THONG_THAI");
  });

  it("các trường thừa do client tự thêm (rank, voucherValue, averageScore) bị bỏ qua", async () => {
    const body = await (
      await post({ ...FORM, selections: BAD, rank: "KTS_THONG_THAI", voucherValue: 999_000_000, averageScore: 100 })
    ).json();
    expect(body.rank.id).toBe("HOC_VIEC_TRIEN_VONG");
    expect(body.voucherValue).toBe(1_000_000);
  });

  it("thiếu lựa chọn của một màn → 400 INCOMPLETE_SELECTIONS, không ghi lead", async () => {
    const { living_wall: _skip, ...two } = IDEAL;
    void _skip;
    const res = await post({ ...FORM, selections: two });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: "INCOMPLETE_SELECTIONS" });
    expect(send).not.toHaveBeenCalled();
  });

  it("selections rỗng → 400", async () => {
    const res = await post({ ...FORM, selections: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INCOMPLETE_SELECTIONS");
  });

  it("vật liệu không tồn tại → 400 VALIDATION", async () => {
    const res = await post({ ...FORM, selections: { ...IDEAL, sink_cabinet: { core: "GOLD", surface: "ACRYLIC", edge: "PUR_NOLINE" } } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("POST /api/lead — validation", () => {
  it("SĐT sai → 400 VALIDATION kèm fieldErrors.phone", async () => {
    const res = await post({ ...FORM, phone: "12345", selections: IDEAL });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(body.fieldErrors.phone.length).toBeGreaterThan(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("chưa đồng ý liên hệ / tên quá ngắn → 400", async () => {
    expect((await post({ ...FORM, consent: false, selections: IDEAL })).status).toBe(400);
    expect((await post({ ...FORM, name: "A", selections: IDEAL })).status).toBe(400);
  });

  it("body không phải JSON / rỗng / quá lớn → 400/413", async () => {
    expect((await post("{not json", {}, true)).status).toBe(400);
    expect((await post("", {}, true)).status).toBe(400);
    expect((await post("x".repeat(25_000), {}, true)).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("chấp nhận SĐT dạng +84", async () => {
    const res = await post({ ...FORM, phone: "+84912345678", selections: IDEAL });
    expect(res.status).toBe(200);
    expect(send.mock.calls[0][0].phone).toBe("0912345678");
  });
});

describe("POST /api/lead — honeypot", () => {
  it("ô ẩn có nội dung → trả 200 giả, KHÔNG ghi lead", async () => {
    const res = await post({ ...FORM, website: "http://spam.example", selections: IDEAL });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("honeypot có hiệu lực dù phần còn lại của payload không hợp lệ", async () => {
    const res = await post({ website: "x" });
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("ô ẩn để trống hoặc chỉ có khoảng trắng → xử lý như người thật", async () => {
    expect((await post({ ...FORM, website: "", selections: IDEAL })).status).toBe(200);
    expect(send).toHaveBeenCalledOnce();
  });
});

describe("POST /api/lead — rate limit", () => {
  it("quá 8 lượt/IP → 429 kèm Retry-After; IP khác không bị ảnh hưởng", async () => {
    const headers = { "x-forwarded-for": "203.0.113.7, 10.1.1.1" };
    for (let i = 0; i < 8; i++) expect((await post({ ...FORM, selections: IDEAL }, headers)).status).toBe(200);

    const blocked = await post({ ...FORM, selections: IDEAL }, headers);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await blocked.json()).toMatchObject({ ok: false, error: "RATE_LIMITED" });
    expect(send).toHaveBeenCalledTimes(8);

    expect((await post({ ...FORM, selections: IDEAL })).status).toBe(200);
  });
});

describe("POST /api/lead — webhook lỗi", () => {
  it("Google Sheets lỗi → 502 UPSTREAM, KHÔNG trả voucher (để người chơi thử lại)", async () => {
    send.mockRejectedValueOnce(new WebhookError("Webhook trả HTTP 500."));
    const res = await post({ ...FORM, selections: IDEAL });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "UPSTREAM" });
    expect(body.voucherCode).toBeUndefined();
  });

  it("chế độ mock (sendLeadToSheets trả 'mock') vẫn trả voucher bình thường", async () => {
    send.mockResolvedValueOnce("mock");
    const res = await post({ ...FORM, selections: IDEAL });
    expect(res.status).toBe(200);
    expect((await res.json()).voucherCode).toMatch(/^MDA-KTS-/);
  });
});
