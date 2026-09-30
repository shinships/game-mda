import { describe, expect, it, vi } from "vitest";
import { submitLeadRequest } from "@/lib/leadClient";
import type { LeadPayload } from "@/types/game";

const PAYLOAD: LeadPayload = {
  name: "An",
  phone: "0912345678",
  consent: true,
  selections: { sink_cabinet: { core: "PVC_WPB", surface: "ACRYLIC", edge: "PUR_NOLINE" } },
};
const SUCCESS = {
  ok: true,
  voucherCode: "MDA-KTS-ABC234",
  rank: { id: "KTS_THONG_THAI", title: "KTS Thông Thái" },
  voucherValue: 5_000_000,
  voucherLabel: "5.000.000đ",
  averageScore: 100,
  zaloUrl: "https://zalo.me/x",
};
const res = (body: unknown, status = 200) =>
  vi.fn(() => Promise.resolve(new Response(typeof body === "string" ? body : JSON.stringify(body), { status })));
const call = (fetchImpl: ReturnType<typeof res>) => submitLeadRequest(PAYLOAD, { fetchImpl: fetchImpl as unknown as typeof fetch });

describe("submitLeadRequest", () => {
  it("POST JSON tới /api/lead và trả phản hồi thành công đã kiểm tra shape", async () => {
    const fetchImpl = res(SUCCESS);
    expect(await call(fetchImpl)).toEqual(SUCCESS);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/lead");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(PAYLOAD);
  });

  it("phản hồi 200 sai shape → lỗi SERVER (không tin dữ liệu lạ)", async () => {
    expect(await call(res({ ok: true, voucherCode: "hack" }))).toMatchObject({ ok: false, error: "SERVER" });
  });

  it("400 VALIDATION giữ fieldErrors và message của server", async () => {
    const out = await call(res({ ok: false, error: "VALIDATION", message: "Sai SĐT", fieldErrors: { phone: ["sai"] } }, 400));
    expect(out).toEqual({ ok: false, error: "VALIDATION", message: "Sai SĐT", fieldErrors: { phone: ["sai"] } });
  });

  it("429 giữ retryAfterSec", async () => {
    const out = await call(res({ ok: false, error: "RATE_LIMITED", message: "Chậm thôi", retryAfterSec: 30 }, 429));
    expect(out).toMatchObject({ ok: false, error: "RATE_LIMITED", retryAfterSec: 30 });
  });

  it("502 UPSTREAM", async () => {
    expect(await call(res({ ok: false, error: "UPSTREAM", message: "Bận" }, 502))).toMatchObject({ ok: false, error: "UPSTREAM", message: "Bận" });
  });

  it("lỗi không có body JSON → suy ra mã từ HTTP status, dùng thông báo mặc định", async () => {
    expect(await call(res("<html>oops</html>", 500))).toMatchObject({ ok: false, error: "SERVER" });
    expect(await call(res("nope", 429))).toMatchObject({ ok: false });
    expect(await call(res({ ok: false, error: "LẠ" }, 429))).toMatchObject({ error: "RATE_LIMITED" });
    expect(await call(res({}, 400))).toMatchObject({ error: "VALIDATION" });
  });

  it("lỗi mạng/timeout → NETWORK, không throw", async () => {
    const fail = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await submitLeadRequest(PAYLOAD, { fetchImpl: fail as unknown as typeof fetch })).toMatchObject({ ok: false, error: "NETWORK" });
  });

  it("tự huỷ request khi quá thời gian chờ", async () => {
    const hang = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );
    const out = await submitLeadRequest(PAYLOAD, { fetchImpl: hang as unknown as typeof fetch, timeoutMs: 10 });
    expect(out).toMatchObject({ ok: false, error: "NETWORK" });
  });
});
