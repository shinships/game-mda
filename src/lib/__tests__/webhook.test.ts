import { describe, expect, it, vi } from "vitest";
import { maskName, maskPhone, sendLeadToSheets, WebhookError, type LeadRecord } from "@/lib/webhook";

const RECORD: LeadRecord = {
  submittedAt: "2026-01-01T00:00:00.000Z",
  name: "Nguyễn Văn A",
  phone: "0912345678",
  project: "Căn hộ 2PN",
  averageScore: 90,
  levelScores: { sink_cabinet: 100, kids_bedroom: 90, living_wall: 80 },
  rankId: "KTS_THONG_THAI",
  rankTitle: "KTS Thông Thái",
  voucherCode: "MDA-KTS-ABC234",
  voucherValue: 5_000_000,
  utm: { utm_source: "facebook" },
  durationMs: 45_000,
  scoreMismatch: false,
};
const ENV = { GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/x/exec", WEBHOOK_SECRET: "s3cret" };
const silent = { info: vi.fn(), warn: vi.fn() };
const reply = (body: unknown, init?: ResponseInit) => Promise.resolve(new Response(typeof body === "string" ? body : JSON.stringify(body), init));

describe("sendLeadToSheets — mock", () => {
  it("thiếu URL → mock: không gọi fetch, log đã che tên/SĐT", async () => {
    const fetchImpl = vi.fn();
    const logger = { info: vi.fn(), warn: vi.fn() };
    const mode = await sendLeadToSheets(RECORD, { env: {}, fetchImpl, logger });
    expect(mode).toBe("mock");
    expect(fetchImpl).not.toHaveBeenCalled();
    const logged = JSON.stringify(logger.info.mock.calls);
    expect(logged).toContain("09****5678");
    expect(logged).not.toContain("0912345678");
    expect(logged).not.toContain("Nguyễn");
    expect(logged).toContain("MDA-KTS-ABC234");
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("mock ở production → cảnh báo lead không được lưu", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    await sendLeadToSheets(RECORD, { env: { NODE_ENV: "production" }, logger });
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("che SĐT/tên", () => {
    expect(maskPhone("0912345678")).toBe("09****5678");
    expect(maskPhone("123")).toBe("****");
    expect(maskName("Lan")).toBe("L***");
  });
});

describe("sendLeadToSheets — gửi thật", () => {
  it("POST JSON có secret + dữ liệu lead, theo redirect, trả 'sent'", async () => {
    const fetchImpl = vi.fn(() => reply({ ok: true, duplicate: false }));
    const mode = await sendLeadToSheets(RECORD, { env: ENV, fetchImpl, logger: silent });
    expect(mode).toBe("sent");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENV.GOOGLE_SHEETS_WEBHOOK_URL);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("follow");
    expect(JSON.parse(init.body as string)).toMatchObject({
      secret: "s3cret",
      source: "web-game",
      name: "Nguyễn Văn A",
      phone: "0912345678",
      voucherCode: "MDA-KTS-ABC234",
      averageScore: 90,
    });
  });

  it("thiếu WEBHOOK_SECRET khi đã có URL → lỗi cấu hình, không gọi mạng", async () => {
    const fetchImpl = vi.fn();
    await expect(
      sendLeadToSheets(RECORD, { env: { GOOGLE_SHEETS_WEBHOOK_URL: ENV.GOOGLE_SHEETS_WEBHOOK_URL }, fetchImpl, logger: silent }),
    ).rejects.toThrow(/WEBHOOK_SECRET/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["HTTP 500", () => reply("x", { status: 500 }), /HTTP 500/],
    ["Apps Script từ chối (secret sai)", () => reply({ ok: false, error: "UNAUTHORIZED" }), /UNAUTHORIZED/],
    ["trả HTML thay vì JSON", () => reply("<html>Sign in</html>"), /không trả JSON/],
    ["lỗi mạng", () => Promise.reject(new TypeError("fetch failed")), /fetch failed/],
  ])("ném WebhookError khi %s", async (_name, impl, pattern) => {
    const promise = sendLeadToSheets(RECORD, { env: ENV, fetchImpl: vi.fn(impl) as unknown as typeof fetch, logger: silent });
    await expect(promise).rejects.toBeInstanceOf(WebhookError);
    await expect(promise).rejects.toThrow(pattern);
  });
});
