/**
 * Tracking Meta Pixel + GA4. An toàn khi script chưa nạp (adblock, thiếu env, SSR): không bao giờ throw.
 * KHÔNG truyền dữ liệu cá nhân (tên, SĐT…) vào đây.
 */
export type TrackEvent = "game_start" | "level_complete" | "game_complete" | "Lead";
export type TrackParams = Record<string, string | number | boolean | undefined>;

type Tracker = (...args: unknown[]) => void;
interface TrackingWindow {
  fbq?: Tracker;
  gtag?: Tracker;
}

/** Sự kiện "Lead" là sự kiện chuẩn của Meta; GA4 dùng tên chuẩn tương ứng là `generate_lead`. */
export function track(event: TrackEvent, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as TrackingWindow;
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));

  try {
    if (typeof w.fbq === "function") {
      if (event === "Lead") w.fbq("track", "Lead", clean);
      else w.fbq("trackCustom", event, clean);
    }
  } catch {
    /* tracking không được phép làm hỏng game */
  }
  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", event === "Lead" ? "generate_lead" : event, clean);
    }
  } catch {
    /* như trên */
  }
}
