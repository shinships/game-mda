# CLAUDE.md — Xưởng Phối Vật Liệu Nội Thất

Hướng dẫn cho **Claude Code** khi làm việc trong repo này. Codex đọc `AGENTS.md` (phần UI).
Spec gốc: `~/Downloads/game nội thất.md` · Kế hoạch & tiến độ: `docs/PLAN.md`.

## 1. Game là gì

Mini-game trên landing page của **MD Architects (Nội thất Minh Đức)** — "Thử Thách 60s Bóc Mẽ Vật Liệu Nội Thất".

- **Mục tiêu kép:** (1) **Educate** — dạy khách phân biệt cốt / bề mặt / nẹp cạnh của gỗ công nghiệp;
  (2) **Lead Gen** — thu Tên + SĐT Zalo để đổi voucher.
- **Khách mục tiêu:** chủ nhà 30–55 tuổi đang tìm nhà thầu nội thất, vào từ quảng cáo Meta/Google, chủ yếu trên **mobile**.
- **Người chơi** đóng vai KTS: đọc đề bài của khách → chọn 3 lớp vật liệu (Cốt → Bề mặt → Nẹp cạnh) → bấm "Kiểm định" → xem stress-test + giải thích kỹ thuật.

### Luồng 7 màn

```
1 Hero CTA → 2 Đề bài + chọn vật liệu → 3 Chấm điểm & Educate → (lặp cho 3 màn chơi)
→ 5 Tổng kết Rank → 6 Form nhận quà (Lead) → 7 Thank You (mã voucher + nút Zalo OA)
```

### 3 màn chơi (`src/data/scenarios.json`)

| Level | id | Khu vực | Ngân sách | Bài học chính |
|---|---|---|---|---|
| 1 | `sink_cabinet` | Khoang chậu rửa & tủ bếp dưới | STANDARD | Chống ẩm: cốt PVC/WPB hoặc MDF lõi xanh + nẹp PUR No-line, **không** MFC |
| 2 | `kids_bedroom` | Bàn học & tủ áo phòng trẻ em | BUDGET | Phát thải Formaldehyde thấp (E1/CARB P2); không "quá tay" về giá |
| 3 | `living_wall` | Vách TV phòng khách | PREMIUM | Mặt phẳng, chống cong vênh trên nhịp dài; thẩm mỹ liền khối |

### Chấm điểm

Điểm mỗi màn 0–100 = **Cốt 50 + Bề mặt 25 + Nẹp 25**. Mỗi lựa chọn: *ideal* = 100% điểm thành phần,
*acceptable* = 50%, không nằm trong danh sách = 10%, *forbidden* = 0% + giới hạn tối đa 40 điểm (FAIL) + hiệu ứng lỗi.
Sau đó trừ điểm theo `penaltyRules` (dữ liệu) và trừ nhẹ 5 điểm nếu "quá tay" ở màn `BUDGET`.
`PERFECT ≥ 80`, `PASS ≥ 50`, còn lại `FAIL`. Hằng số nằm ở `src/data/scoring.ts`.

### Rank & voucher (theo điểm trung bình các màn)

| Điểm TB | Rank | Voucher |
|---|---|---|
| ≥ 90 | KTS Thông Thái | 5.000.000đ |
| 70–89 | Thợ Cả Tinh Mắt | 3.000.000đ |
| < 70 | Học Việc Triển Vọng | 1.000.000đ + cẩm nang vật liệu |

## 2. Phân vai Claude ↔ Codex

**Claude sở hữu** (được sửa tự do):
`src/types/**`, `src/data/**`, `src/lib/**`, `src/store/**`, `src/app/api/**`, `integrations/**`, `docs/**`,
mọi file test, cấu hình (`package.json`, `tsconfig`, `vitest.config`, `.env.example`), `CLAUDE.md`, `AGENTS.md`.

**Codex sở hữu:** `src/components/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, styling/animation.
**Không sửa** các file này trừ khi user yêu cầu rõ. Nếu cần Codex đổi UI → ghi vào `docs/requests.md`.

Codex cần đổi logic → họ ghi vào `docs/requests.md`; Claude xử lý rồi đánh dấu `[x]`.
Placeholder `src/app/page.tsx` do Claude tạo chỉ để build chạy được, Codex sẽ thay thế.

## 3. Tech stack & lệnh

Next.js (App Router, `src/`) · TypeScript strict · Tailwind CSS · Zustand · Zod · React Hook Form · Framer Motion · Lucide · Vitest.

```bash
npm run dev            # dev server http://localhost:3000
npm run build          # production build
npm run lint           # ESLint
npm test               # vitest run
npm run typecheck      # next typegen + tsc --noEmit (cần typegen vì layout.tsx dùng kiểu LayoutProps do Next sinh)
```

Biến môi trường (`.env.example` → `.env.local`):

| Biến | Dùng cho |
|---|---|
| `GOOGLE_SHEETS_WEBHOOK_URL` | URL web app Apps Script nhận lead (thiếu → API chạy chế độ **mock**, chỉ log) |
| `WEBHOOK_SECRET` | Secret chung giữa API và Apps Script |
| `NEXT_PUBLIC_ZALO_OA_URL` | Link Zalo OA cho nút "Chat tư vấn" |
| `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_ID` | Tracking (Codex gắn script trong `layout.tsx`) |

## 4. Quy tắc bắt buộc

1. **Evaluator là pure function** (`src/lib/evaluator.ts`): không I/O, không `Date`, không random.
2. **Mọi thay đổi luật chấm phải kèm test** (`src/lib/__tests__`). Thêm màn mới → chỉ thêm dữ liệu vào `scenarios.json`;
   test tính toàn vẹn dữ liệu sẽ bắt lỗi (combo ideal phải đạt 100, không vượt trần ngân sách…).
3. **Server là nguồn sự thật** cho điểm & voucher: `/api/lead` tự chấm lại từ `selections`, bỏ qua điểm client gửi lên.
4. **Không lưu PII** (tên, SĐT) trong sessionStorage hay gửi vào analytics.
5. **Nội dung tiếng Việt**, giọng chuyên gia nhưng gần gũi. Tránh cam kết tuyệt đối ("an toàn tuyệt đối", "chống nước 100%").
   Số liệu kỹ thuật/thương hiệu chưa được KTS/sale duyệt phải nằm trong `docs/content-review.md`.
6. **Thay đổi contract store** (tên action/selector, `GamePhase`, shape state) → cập nhật mục *Store contract* trong `AGENTS.md`
   trong cùng lần sửa, vì Codex phụ thuộc vào đó.
7. Alias import `@/*` → `src/*`. Không import `node:*` hoặc `src/lib/voucher.ts`, `src/lib/webhook.ts` từ code client.

## 5. Bản đồ code

```
src/types/game.ts          Toàn bộ type (spec + mở rộng)
src/data/materials.ts      Catalog vật liệu (nhãn VN, mô tả, tag, costIndex, màu tag)
src/data/scenarios.json    3 màn chơi (+ scenarios.ts: bản đã gắn type)
src/data/scoring.ts        Hằng số chấm điểm
src/data/ranks.ts          Bảng rank/voucher
src/lib/evaluator.ts       evaluateChoice(scenario, choice)
src/lib/ranking.ts         Điểm TB → rank
src/lib/gameFlow.ts        Bảng transition hợp lệ của state machine
src/lib/analytics.ts       track() an toàn khi thiếu fbq/gtag
src/lib/validation/lead.ts Zod schema + chuẩn hoá SĐT (dùng chung client/server)
src/lib/voucher.ts         Sinh mã voucher (server-only)
src/lib/leadService.ts     Server: chấm lại + xếp rank + sinh voucher từ payload
src/lib/webhook.ts         Server: POST Google Sheets
src/lib/rateLimit.ts       Rate limit theo IP (in-memory)
src/lib/leadClient.ts      Client gọi /api/lead (không bao giờ throw)
src/lib/leadErrors.ts      Thông báo lỗi lead dùng chung client/server
src/lib/utm.ts             Bắt & làm sạch UTM/fbclid/gclid
src/store/useGameStore.ts  Zustand store + persist(sessionStorage) + hydration
src/store/restore.ts       Kiểm tra & khôi phục tiến trình từ sessionStorage
src/test/setup.ts          Giả lập sessionStorage cho vitest (môi trường node)
src/app/api/lead/route.ts  POST /api/lead
integrations/google-apps-script/  Code.gs + README
```
