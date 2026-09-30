# Kế hoạch: Web Game "Xưởng Phối Vật Liệu Nội Thất"

> **Cho model thực thi:** đọc spec gốc `/Users/mktmda/Downloads/game nội thất.md` trước. Làm tuần tự Phase 0 → 6, mỗi phase xong chạy test/typecheck liên quan rồi mới sang phase kế. Phase 7 là của Codex — không làm. Bước đầu tiên: copy file plan này vào `docs/PLAN.md` trong project và tick `[x]` từng task khi xong.

## Context
MD Architects (Nội thất Minh Đức) cần mini-game trên landing page để (1) giáo dục khách về vật liệu gỗ công nghiệp (cốt / bề mặt / nẹp cạnh) và (2) thu lead (Tên + SĐT Zalo) đổi voucher. Spec gốc: `~/Downloads/game nội thất.md`. Thư mục `/Users/mktmda/Projects/game-mda` đang trống.

Đã chốt với user:
- **Claude Code làm phần logic** (types, data, rules engine, store, API lead). **Codex làm UI**.
- **Next.js App Router** — landing mới, deploy Vercel.
- **Voucher theo bậc điểm**. Lead đổ về **Google Sheets** (Apps Script webhook).
- Viết **CLAUDE.md** + **AGENTS.md** mô tả game và phân vai Claude / Codex.

## Đề xuất cải tiến so với spec gốc (áp dụng trong các phase dưới)
1. Evaluator gốc không dùng `idealCombination` → chọn bừa vẫn 100đ. Viết lại: chấm theo thành phần Cốt 50 · Bề mặt 25 · Nẹp 25 (ideal = full, acceptable = một phần, forbidden = 0 + hiệu ứng lỗi).
2. Luật trừ điểm dạng dữ liệu (`penaltyRules` trong JSON) → thêm màn mới không sửa code.
3. Dùng đủ 4 `visualEffect` (BULGING_EDGES, WARPING, SCRATCHED, PERFECT_GLOSS) có thứ tự ưu tiên.
4. Dùng `budgetTier`: chọn "quá tay" ở màn BUDGET bị trừ nhẹ + tip → định vị tư vấn đúng nhu cầu.
5. Thêm màn 3 **Vách TV phòng khách (LIVING_WALL)** (zone đã khai báo nhưng chưa có đề).
6. Chống gian lận: server tự chấm lại điểm và sinh voucher; honeypot + rate-limit; chuẩn hoá SĐT VN.
7. Tracking Meta Pixel / GA4 + lưu UTM cho chạy Ads.
8. Lưu tiến trình vào sessionStorage.
9. Nội dung kỹ thuật cần KTS/sale duyệt: làm mềm "an toàn tuyệt đối", "chống nước 100%"; kiểm lại số liệu E1/CARB-P2; xác nhận thương hiệu "Minh Long" ở TrustSection.

---

## Phase 0 — Tài liệu định hướng dự án  *(Claude)*
- [x] **T0.1 `CLAUDE.md`** (hướng dẫn cho Claude Code):
  - Mô tả game: mục tiêu (Educate + Lead Gen), khách hàng mục tiêu, luồng 7 màn, 3 màn chơi, bảng rank/voucher.
  - Vai trò Claude: sở hữu `src/types`, `src/data`, `src/lib`, `src/store`, `src/app/api`, `integrations/`, tests. **Không** sửa `src/components/**` (của Codex) trừ khi được yêu cầu.
  - Tech stack, lệnh (`npm run dev|build|test`, `npx tsc --noEmit`), biến môi trường.
  - Quy tắc: evaluator là pure function; mọi thay đổi luật chấm phải kèm test; server là nguồn sự thật cho điểm/voucher; nội dung tiếng Việt; thay đổi contract store → cập nhật mục "Store contract" trong AGENTS.md.
- [x] **T0.2 `AGENTS.md`** (hướng dẫn cho Codex — Codex đọc file này):
  - Tóm tắt game + luồng màn hình giống CLAUDE.md.
  - Vai trò Codex: sở hữu `src/components/**`, `src/app/page.tsx`, `src/app/layout.tsx`, styling/animation; **không** sửa logic trong `src/lib`, `src/store`, `src/data` — cần thay đổi thì ghi yêu cầu vào `docs/requests.md`.
  - Design tokens (màu, font Playfair Display + Plus Jakarta Sans), danh sách component theo spec 4.2, đặc tả tương tác 4.3, yêu cầu responsive mobile-first.
  - **Store contract**: bảng `phase → component hiển thị`, danh sách action/selector, map `visualEffect → animation` (phồng mép scale-Y +20% + vệt nước, cong vênh, vết trầy, shimmer gloss), catalog tag màu vật liệu.
  - Checklist bàn giao UI (a11y cơ bản, 375px, không layout shift, event tracking đã gọi qua store).
- [x] **T0.3** `docs/requests.md` rỗng làm kênh trao đổi Claude ↔ Codex.

## Phase 1 — Scaffold  *(Claude)*
- [x] T1.1 `create-next-app` (TS, Tailwind, App Router, `src/`, ESLint).
- [x] T1.2 Cài `zustand zod react-hook-form @hookform/resolvers framer-motion lucide-react`; dev `vitest`; thêm script `test`.
- [x] T1.3 `.env.example`: `GOOGLE_SHEETS_WEBHOOK_URL`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_ZALO_OA_URL`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_ID`.
- [x] T1.4 `src/app/page.tsx` placeholder tối giản cho Codex thay.

## Phase 2 — Types & Data  *(Claude)*
- [x] T2.1 `src/types/game.ts` — giữ nguyên interface spec + mở rộng `MaterialOption`, `acceptableCombination`, `PenaltyRule`, `GamePhase`, `RankTier`, `LeadPayload`.
- [x] T2.2 `src/data/materials.ts` — catalog 5 cốt / 4 bề mặt / 3 nẹp: nhãn VN, mô tả, spec tags, `costIndex`, token màu tag.
- [x] T2.3 `src/data/scenarios.json` — 3 màn `sink_cabinet`, `kids_bedroom`, `living_wall` đầy đủ `budgetTier`, ideal/acceptable, penaltyRules, giải thích.

## Phase 3 — Rules Engine  *(Claude)*
- [x] T3.1 `src/lib/evaluator.ts` — `evaluateChoice(scenario, choice)` giữ chữ ký spec; throw nếu thiếu lựa chọn; stars đủ 1–5; PERFECT ≥80 / PASS ≥50 / FAIL.
- [x] T3.2 `src/lib/ranking.ts` — điểm TB → rank + voucher: ≥90 "KTS Thông Thái" 5tr · 70–89 "Thợ Cả Tinh Mắt" 3tr · <70 "Học Việc Triển Vọng" 1tr + cẩm nang.
- [x] T3.3 Test `src/lib/__tests__/evaluator.test.ts`, `ranking.test.ts` (combo ideal, MFC ở bồn rửa → FAIL + BULGING_EDGES, EVA ở bồn rửa, over-spec màn BUDGET, biên 69/70/89/90).

## Phase 4 — Game State  *(Claude)*
- [x] T4.1 `src/store/useGameStore.ts` — Zustand + `persist(sessionStorage)`, bảng transition hợp lệ:
  `INTRO → BRIEF → SELECTING → TESTING → RESULT → (BRIEF kế | SUMMARY) → LEAD_FORM → SUBMITTING → SUCCESS | SUBMIT_ERROR`, `reset`.
  Actions `start, select(slot,value), runTest, next, openLeadForm, submitLead, reset`; selectors `currentScenario, canTest, totalScore, rank`; lưu thời gian chơi + UTM.
- [x] T4.2 `src/lib/analytics.ts` — `track()` an toàn khi chưa có `fbq`/`gtag`; store gọi ở `game_start`, `level_complete`, `game_complete`, `Lead`.
- [x] T4.3 Test store: transition sai bị chặn, đi hết luồng 3 màn.

## Phase 5 — Lead & Voucher  *(Claude)*
- [x] T5.1 `src/lib/validation/lead.ts` — Zod dùng chung client/server: tên 2–50, SĐT `^(0|\+84)(3|5|7|8|9)\d{8}$` → chuẩn hoá, dự án optional, đồng ý liên hệ, honeypot.
- [x] T5.2 `src/lib/voucher.ts` — mã `MDA-<TIER>-<6 ký tự>` bằng crypto random (server-only).
- [x] T5.3 `src/app/api/lead/route.ts` — validate → honeypot/rate-limit IP → chấm lại từ selections → sinh voucher → POST Google Sheets kèm secret; thiếu env thì mock. Trả `{voucherCode, rank, voucherValue, zaloUrl}`.
- [x] T5.4 `src/lib/leadClient.ts` — client gọi API, store dùng.
- [x] T5.5 `integrations/google-apps-script/Code.gs` + README cài đặt: `doPost` kiểm secret, append dòng (thời gian, tên, SĐT, dự án, điểm, rank, voucher, UTM), đánh dấu SĐT trùng.

## Phase 6 — Bàn giao & kiểm tra  *(Claude)*
- [x] T6.1 Cập nhật "Store contract" trong AGENTS.md khớp code thực tế.
- [x] T6.2 `npx vitest run`, `npx tsc --noEmit`, `npm run build` sạch.
- [x] T6.3 `npm run dev` + `curl POST /api/lead`: payload hợp lệ, honeypot, SĐT sai, điểm giả mạo → server vẫn trả voucher theo điểm tự chấm; kiểm log mock.

## Phase 7 — UI  *(Codex — ngoài phạm vi thực thi của Claude, chỉ ghi trong AGENTS.md)*
- Landing: `HeroBanner`, `TrustSection`.
- Game: `GameContainer`, `OrderTicket`, `MaterialWorkbench`, `VisualPreview` (mặt cắt 3 lớp + stress test), `ResultSheet`.
- Lead: `LeadCaptureForm` (RHF + schema từ `src/lib/validation/lead.ts`), `VoucherSuccess` (mã + nút Zalo OA).
- Gắn Meta Pixel / GA4 script trong `layout.tsx`.

---

## Ghi chú thực thi (Phase 0 → 6)

- **T1.1**: `create-next-app` từ chối chạy khi `AGENTS.md`/`CLAUDE.md` đã tồn tại → dời tạm ra ngoài, scaffold (`--no-agents-md --disable-git`), rồi trả lại. Repo **chưa `git init`**.
- **T1.2**: `@types/node` nâng `^20` → `^24` vì vitest 5 yêu cầu peer `>=22`; thêm `vitest.config.mts` + `src/test/setup.ts` (giả lập sessionStorage). Script `typecheck` = `next typegen && tsc --noEmit` (`layout.tsx` dùng kiểu `LayoutProps` do Next sinh; `tsc` trần fail trên máy sạch).
- **T5.1 / T5.4** (`validation/lead.ts`, `leadClient.ts`) được viết cùng lúc với T4.1 vì `submitLead` của store phụ thuộc chúng; test và tick ở Phase 5.
- **Lệch nhỏ so với plan**: thêm action `finishTest()` (TESTING → RESULT do UI gọi khi animation xong), mã lỗi `INVALID_STATE`, `results` không lưu vào sessionStorage mà tính lại từ `selections`, `src/lib/leadService.ts` + `leadErrors.ts` + `store/restore.ts` + `utm.ts` + `gameFlow.ts` là module phụ trợ.
- **Mô hình điểm chốt**: ideal 100% · acceptable 50% · khác 10% · forbidden 0% (+ trần 40 điểm); `PERFECT ≥ 80`, `PASS ≥ 50`; sao 90/70/50/30 → 5/4/3/2, còn lại 1. Chi tiết ở `src/data/scoring.ts`.
- **Đã kiểm chứng**: 205 test (vitest), `tsc`, `eslint`, `next build` sạch; `curl` vào dev server (hợp lệ, honeypot, SĐT sai, giả điểm, thiếu màn, rate-limit 429); store chạy trong trình duyệt thật (SSR → hydrate → chơi → tải lại → khôi phục); webhook thử với server giả lập redirect 302 của Apps Script; `Code.gs` thử bằng harness giả lập API Google. **Chưa** chạy với Google Sheets thật (cần tài khoản Google của bạn: làm theo `integrations/google-apps-script/README.md`).
- **Việc còn lại cho người**: duyệt `docs/content-review.md` (đặc biệt "Minh Long", điều kiện voucher, số liệu E1/CARB P2) trước khi chạy Ads.
