# AGENTS.md — Xưởng Phối Vật Liệu Nội Thất (dành cho Codex — phần UI)

Bạn (Codex) dựng **giao diện & hiệu ứng**. Logic game, dữ liệu, store, API do Claude Code làm xong — bạn chỉ **đọc state từ store và gọi action**.
Spec gốc: `~/Downloads/game nội thất.md` (mục 4, 5) · Tiến độ: `docs/PLAN.md` (Phase 7 là của bạn).

## 1. Game là gì (tóm tắt)

Mini-game trên landing page **MD Architects (Nội thất Minh Đức)**: người chơi đóng vai KTS, đọc đề bài của khách → chọn 3 lớp
vật liệu **Cốt → Bề mặt → Nẹp cạnh** → "Kiểm định" (stress-test) → xem giải thích kỹ thuật. Chơi 3 màn → nhận rank + voucher →
điền Tên + SĐT Zalo để nhận mã. Mục tiêu: giáo dục khách về vật liệu + thu lead. Khách chủ yếu vào bằng **mobile** từ quảng cáo.

```
INTRO(Hero) → BRIEF+SELECTING(Đề bài + chọn vật liệu) → TESTING(stress-test) → RESULT(giải thích)
   → (BRIEF màn kế | SUMMARY(Rank)) → LEAD_FORM → SUBMITTING → SUCCESS(voucher + Zalo) | SUBMIT_ERROR
```

3 màn chơi: `sink_cabinet` (chậu rửa, ẩm) · `kids_bedroom` (phòng trẻ, phát thải thấp, ngân sách vừa) · `living_wall` (vách TV, chống cong vênh).

## 2. Phân vai

**Codex sở hữu:** `src/components/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, styling, animation.

**KHÔNG sửa:** `src/lib/**`, `src/store/**`, `src/data/**`, `src/types/**`, `src/app/api/**`, `integrations/**`, test.
Cần đổi logic/dữ liệu/copy vật liệu → ghi vào `docs/requests.md` (mẫu ở đầu file), Claude sẽ xử lý.

Không tự viết lại logic chấm điểm, rank, validation SĐT, gọi API, hay tracking trong component — dùng những gì store/lib đã export.

## 3. Design tokens

| Token | Giá trị |
|---|---|
| Nền trang | `#FAF9F6` (Silk plaster) |
| Card / container | `#FFFFFF`, viền `#E5E5E1` |
| Accent Primary | `#2C3E50` (xanh than kiến trúc) |
| Accent Action (CTA, viền chọn) | `#C8A26A` (vàng sồi mờ) |
| Palette phụ | Walnut, Warm Beige, Sage Green, Slate Gray |
| Heading | **Playfair Display** (`font-serif`) |
| Body / data | **Plus Jakarta Sans** (`font-sans`) — nạp qua `next/font/google` trong `layout.tsx` |

Phong cách: *Architectural Editorial / Warm Minimalist* — nhiều khoảng trắng, đường kẻ mảnh, ảnh/texture gỗ ấm, không neon, không gradient sặc sỡ.

**Màu tag vật liệu** — lấy từ `TAG_TONES` trong `src/data/materials.ts` (đừng hard-code lại):

| `tagTone` | Nền | Chữ | Dùng cho |
|---|---|---|---|
| `green` | `#E8F5E9` | `#2E7D32` | MDF lõi xanh |
| `orange` | `#FFF3E0` | `#E65100` | MFC (ván dăm thường) |
| `blue` | `#E1F5FE` | `#0277BD` | PVC/WPB |
| `slate` | `#ECEFF1` | `#455A64` | HDF |
| `sand` | `#F5EFE6` | `#8A6D3B` | Plywood, bề mặt, nẹp |

## 4. Component cần dựng (spec 4.2)

```
src/components/
├── landing/  HeroBanner.tsx   TrustSection.tsx
├── game/     GameContainer.tsx  OrderTicket.tsx  MaterialWorkbench.tsx  VisualPreview.tsx  ResultSheet.tsx
└── lead/     LeadCaptureForm.tsx  VoucherSuccess.tsx
```

- **HeroBanner** — CTA "Thử Thách 60s Bóc Mẽ Vật Liệu Nội Thất"; nút "Bắt đầu bài test" gọi `start()`.
- **TrustSection** — cam kết vật liệu chính hãng (An Cường…). ⚠️ Spec ghi thêm "Minh Long": **chưa xác nhận** (Minh Long là thương hiệu gốm sứ) — chỉ dùng tên thương hiệu đã được sale xác nhận, xem `docs/content-review.md`.
- **GameContainer** — Modal/khung game; render theo `phase` (bảng ở mục 6). Gọi `useGameHydrated()` một lần; chưa hydrate thì render skeleton/Hero để tránh lệch SSR.
- **OrderTicket** — hiển thị `selectCurrentScenario`: `title`, `customerDemand`, badge `budgetTier`, tiến độ `Màn {levelIndex+1}/{totalLevels}`.
- **MaterialWorkbench** — chọn lần lượt Cốt → Bề mặt → Nẹp. Lặp `SLOT_ORDER` và `MATERIALS_BY_SLOT[slot]` (`src/data/materials.ts`); vật liệu đang chọn lấy từ `selectCurrentSelection`. Gọi `select(slot, id)`; nút "Kiểm định" bật khi `selectCanTest`, bấm gọi `runTest()`.
- **VisualPreview** — mặt cắt 3 lớp (lớp phủ trên – cốt giữa – nẹp cạnh) đổi màu/vân theo `selectCurrentSelection` theo thời gian thực; chạy stress-test khi `phase === 'TESTING'` rồi gọi `finishTest()`.
- **ResultSheet** — bottom-sheet (mobile) / modal (desktop): `score`, `stars`, `feedback.{headline,explanation,expertTip}`, `breakdown` (điểm từng lớp), `penalties`, `budgetNote`. Nút "Tiếp tục" gọi `next()`.
- **LeadCaptureForm** — RHF + `zodResolver(leadFormSchema)` từ `src/lib/validation/lead.ts`. Submit gọi `submitLead(values)` (xem 6.5). Field honeypot `website` phải **ẩn khỏi người dùng** (CSS `sr-only`/off-screen, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
- **VoucherSuccess** — hiện `voucher.voucherCode`, `voucherLabel`, `rank.title`; nút "Chat tư vấn vật liệu qua Zalo" → `voucher.zaloUrl` (ẩn nút nếu `null`). Nút copy mã.

## 5. Tương tác (spec 4.3)

- **MaterialWorkbench:** radio-card có icon mặt cắt + tag thông số (`specTags`, ví dụ "E1", "Không hút nước"). Trạng thái active: **viền kép vàng sồi** + badge "Đã chọn". Dùng `role="radiogroup"`/`radio`, điều hướng được bằng phím mũi tên.
- **VisualPreview realtime:** CSS gradient + SVG pattern vân gỗ; chọn vật liệu nào thì lớp tương ứng đổi ngay.
- **Stress-test (khi `phase === 'TESTING'`, ~2s, xong gọi `finishTest()`)** — chọn animation theo `results[scenarioId].visualEffect`:

| `visualEffect` | Ý nghĩa | Animation |
|---|---|---|
| `BULGING_EDGES` | Trương nở do ẩm (nặng nhất) | Rung giật ngắn → vệt nước thấm vào viền → **phồng mép: `scaleY` +20%** ở nẹp/cạnh |
| `WARPING` | Cong vênh | Khối preview cong nhẹ (skew/rotate + bóng đổ lệch), mép lệch khỏi mặt phẳng |
| `SCRATCHED` | Trầy xước / xuống cấp bề mặt | Overlay vài vệt xước SVG hiện dần trên lớp phủ, độ bóng giảm |
| `PERFECT_GLOSS` | Hoàn hảo | **Shimmer gloss**: dải sáng chéo quét qua bề mặt Acrylic/Laminate + confetti nhẹ tuỳ chọn |

Thứ tự ưu tiên khi nhiều lỗi đã do evaluator chọn sẵn (`BULGING_EDGES` > `WARPING` > `SCRATCHED` > `PERFECT_GLOSS`) — component chỉ đọc 1 giá trị.
Tôn trọng `prefers-reduced-motion`: bỏ rung/phồng, giữ đổi màu/opacity.

## 6. Store contract (`src/store/useGameStore.ts`)

> Khớp với code tại thời điểm hoàn thành Phase 6 (T6.1). Nếu thấy lệch với code thật → **code là đúng**, ghi vào `docs/requests.md`.
> Mọi component đọc store phải là **client component** (`"use client"`).

```ts
import {
  useGameStore, useGameHydrated,
  selectCurrentScenario, selectCurrentSelection, selectCurrentResult,
  selectCanTest, selectTotalScore, selectAverageScore, selectRank,
} from "@/store/useGameStore";
import { SCENARIOS } from "@/data/scenarios";                     // toàn bộ màn chơi, đã sắp theo level
import { MATERIALS_BY_SLOT, SLOT_ORDER, SLOT_LABELS, getMaterial, TAG_TONES } from "@/data/materials";
import { leadFormSchema } from "@/lib/validation/lead";
import type { LeadFormValues, EvaluationResult, RoomScenario, LeadSuccessResponse } from "@/types/game";
```

### 6.1 Phase → component hiển thị

| `phase` | Hiển thị | Action người chơi có thể gọi |
|---|---|---|
| `INTRO` | `HeroBanner` (+ `TrustSection`) | `start()` |
| `BRIEF` | `OrderTicket` (đề bài mới, chưa chọn gì) + `MaterialWorkbench` | `select()` (tự chuyển `SELECTING`), `next()` (→ `SELECTING`) |
| `SELECTING` | `OrderTicket` + `MaterialWorkbench` + `VisualPreview` | `select()`, `runTest()` khi `canTest` |
| `TESTING` | `VisualPreview` chạy stress-test (~2s) | `finishTest()` khi animation xong |
| `RESULT` | `ResultSheet` | `next()` |
| `SUMMARY` | Tổng kết rank + điểm từng màn | `openLeadForm()`, `reset()` |
| `LEAD_FORM` | `LeadCaptureForm` | `submitLead(values)` |
| `SUBMITTING` | `LeadCaptureForm` ở trạng thái loading (disable mọi input) | — |
| `SUCCESS` | `VoucherSuccess` | `reset()` |
| `SUBMIT_ERROR` | `LeadCaptureForm` + banner `submitError` | `submitLead(values)` (thử lại), `openLeadForm()` (xoá banner) |

- Chuyển phase hợp lệ: `INTRO→BRIEF→SELECTING→TESTING→RESULT→(BRIEF | SUMMARY)→LEAD_FORM→SUBMITTING→(SUCCESS | SUBMIT_ERROR)`; `SUBMIT_ERROR→SUBMITTING | LEAD_FORM`.
- **Action gọi sai phase bị bỏ qua** (không throw, state không đổi). `reset()` là ngoại lệ: gọi được mọi phase, về `INTRO`, xoá tiến trình (giữ `utm`).
- `TESTING` không tự kết thúc: **component phải gọi `finishTest()`** sau animation (kể cả khi `prefers-reduced-motion`: dùng timeout ngắn). Nếu người dùng tải lại trang giữa chừng, store khôi phục về `RESULT`.

### 6.2 State đọc được

Đọc bằng selector nhỏ để tránh re-render thừa: `const phase = useGameStore((s) => s.phase)`.
**Không** trả về object/array mới từ selector (zustand v5 sẽ lặp vô hạn); nếu cần thì dùng `useShallow` hoặc tự tính bằng `useMemo`.

| Field | Kiểu | Ghi chú |
|---|---|---|
| `phase` | `GamePhase` | xem bảng 6.1 |
| `levelIndex` | `number` | 0-based; màn hiện tại. Hiển thị "Màn `levelIndex + 1`/`totalLevels`" |
| `totalLevels` | `number` | = `SCENARIOS.length` (3) |
| `selections` | `Record<scenarioId, PlayerSelection>` | `{ core, surface, edge }`, mỗi lớp `null` nếu chưa chọn |
| `results` | `Record<scenarioId, EvaluationResult>` | có sau `runTest()` |
| `startedAt` / `finishedAt` | `number \| null` | epoch ms; `finishedAt` set khi vào `SUMMARY` |
| `voucher` | `LeadSuccessResponse \| null` | có khi `SUCCESS` |
| `submitError` | `string \| null` | thông báo tiếng Việt, hiển thị thẳng (khi `SUBMIT_ERROR`) |
| `utm` | `UtmParams` | tự bắt từ URL khi `start()`, không cần UI |
| `hasHydrated` | `boolean` | dùng qua `useGameHydrated()` |

### 6.3 Selector

Truyền trực tiếp vào hook: `useGameStore(selectCurrentScenario)`. Tất cả trả về tham chiếu ổn định.

| Selector | Trả về |
|---|---|
| `selectCurrentScenario` | `RoomScenario` màn hiện tại (`title`, `customerDemand`, `budgetTier`, `zone`, `level`…) |
| `selectCurrentSelection` | `PlayerSelection` của màn hiện tại (3 lớp, có thể `null`) |
| `selectCurrentResult` | `EvaluationResult \| null` của màn hiện tại |
| `selectCanTest` | `boolean`: đang `SELECTING` và đã đủ 3 lớp → bật nút "Kiểm định" |
| `selectTotalScore` | tổng điểm các màn đã chấm (tối đa 300) |
| `selectAverageScore` | điểm trung bình làm tròn (0–100), khớp với điểm quyết định rank |
| `selectRank` | `RankTier`: `title`, `voucherValue`, `voucherLabel`, `description`, `bonus?` |

Màn `SUMMARY` cần điểm từng màn: lặp `SCENARIOS` rồi tra `results[scenario.id]`.

### 6.4 Action

| Action | Chữ ký | Chuyển phase / hiệu ứng |
|---|---|---|
| `start` | `() => void` | `INTRO → BRIEF`; bắt UTM; bắn `game_start` |
| `select` | `(slot: SlotKey, value: MaterialId) => void` | `BRIEF/SELECTING → SELECTING`. Bỏ qua nếu `value` không thuộc `slot` (ví dụ đưa `ACRYLIC` vào `core`). Chọn lại thoải mái trước khi kiểm định |
| `runTest` | `() => void` | `SELECTING → TESTING`; **chấm điểm ngay** → `results[id]` có sẵn; bắn `level_complete` |
| `finishTest` | `() => void` | `TESTING → RESULT` |
| `next` | `() => void` | `BRIEF → SELECTING`; `RESULT → BRIEF` (màn kế) hoặc `SUMMARY` (hết màn; bắn `game_complete`) |
| `openLeadForm` | `() => void` | `SUMMARY / SUBMIT_ERROR → LEAD_FORM` |
| `submitLead` | `(values: LeadFormValues) => Promise<LeadSubmitOutcome>` | xem 6.5 |
| `reset` | `() => void` | mọi phase → `INTRO` |

`SlotKey = "core" | "surface" | "edge"`; thứ tự chọn là `SLOT_ORDER`, tên hiển thị là `SLOT_LABELS` ("Cốt ván", "Bề mặt", "Nẹp cạnh").

### 6.5 Lead: `submitLead` và form

- Form dùng `useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema), defaultValues: { name: "", phone: "", project: "", consent: false, website: "" } })`.
  Schema **không transform** dữ liệu nên kiểu vào = kiểu ra; SĐT chuẩn hoá (`+84…`, khoảng trắng, dấu chấm) là việc của server.
- Gọi `await submitLead(values)`. Store tự validate lại và gắn `selections`, UTM, thời gian chơi. Kết quả:
  - **Thành công** → phase `SUCCESS`, `voucher` có dữ liệu.
  - **Lỗi mạng/máy chủ/rate-limit** → phase `SUBMIT_ERROR`, `submitError` là thông báo hiển thị thẳng. Người dùng bấm gửi lại được (không mất form nếu bạn giữ giá trị RHF).
  - **Form không hợp lệ** → trả `{ ok: false, error: "VALIDATION", fieldErrors }`, **phase giữ nguyên `LEAD_FORM`** (hiếm khi xảy ra vì RHF đã chặn trước; có thể `setError` từ `fieldErrors`).
  - Gọi sai phase (kể cả double-click khi đang `SUBMITTING`) → `{ ok: false, error: "INVALID_STATE" }`, không gọi API.
- Giá trị trả về `LeadSubmitOutcome = LeadSuccessResponse | LeadErrorResponse`:

```ts
LeadSuccessResponse = { ok: true, voucherCode: "MDA-KTS-7H2QXM", rank: { id, title }, voucherValue: 5000000, voucherLabel: "5.000.000đ", averageScore: 100, zaloUrl: string | null }
LeadErrorResponse   = { ok: false, error: "VALIDATION" | "INCOMPLETE_SELECTIONS" | "RATE_LIMITED" | "UPSTREAM" | "NETWORK" | "SERVER" | "INVALID_STATE", message: string, fieldErrors?: Record<string, string[]>, retryAfterSec?: number }
```

- **Honeypot** `website`: ô ẩn khỏi người dùng (xem `LeadCaptureForm`). Bot điền vào sẽ nhận phản hồi "thành công" giả nhưng không được ghi lại.
- Voucher & rank hiển thị ở `SUCCESS` lấy từ `voucher` (do **server** tính), có thể khác `selectRank` nếu client bị giả mạo, nên dùng `voucher` cho màn Thank You.

### 6.6 Lưu tiến trình & hydration

- Store lưu tiến trình vào `sessionStorage` (khoá `mda-game-v1`): `phase`, `levelIndex`, `selections`, thời gian, `utm`, `voucher`. **Không lưu tên/SĐT/`results`** (`results` được chấm lại từ `selections` khi khôi phục).
- Khôi phục: `TESTING → RESULT`; `SUBMITTING`/`SUBMIT_ERROR → LEAD_FORM`; dữ liệu hỏng/không nhất quán → bỏ qua, bắt đầu từ `INTRO`.
- Store dùng `skipHydration` để không lệch HTML server/client. **`GameContainer` phải gọi `const hydrated = useGameHydrated()` đúng một lần**; khi `hydrated === false` chỉ render Hero/skeleton (không render theo `phase`).

### 6.7 Catalog & dữ liệu tĩnh (chỉ đọc)

- `MATERIALS_BY_SLOT.core | .surface | .edge` → mảng `MaterialOption`: `{ id, slot, label, shortLabel, description, specTags: { label, kind: "positive" | "neutral" | "caution" }[], costIndex, tagTone }`. `getMaterial(id)` tra theo id. Màu tag: `TAG_TONES[tagTone]` → `{ bg, text }`.
- `EvaluationResult` (từ `results[id]` / `selectCurrentResult`): `score` 0–100, `stars` 1–5, `status` `FAIL | PASS | PERFECT`, `visualEffect`, `feedback: { headline, explanation, expertTip }`,
  `breakdown: { slot, material, verdict: "IDEAL" | "ACCEPTABLE" | "NEUTRAL" | "FORBIDDEN", points, maxPoints }[]` (điểm từng lớp, thứ tự core → surface → edge),
  `penalties: { id, points, message }[]`, `overspent: boolean`, `budgetNote?`.
- `RoomScenario.budgetTier` ∈ `BUDGET | STANDARD | PREMIUM` (copy hiển thị do bạn quyết định, ví dụ "Ngân sách vừa phải" / "Tiêu chuẩn" / "Cao cấp").
- Tracking (`game_start`, `level_complete`, `game_complete`, `Lead`) do store bắn; component không gọi `fbq`/`gtag`.

## 7. Checklist bàn giao UI

- [ ] Chạy mượt ở **375px** (iPhone SE/mini), không scroll ngang; tap target ≥ 44px; bottom-sheet không che nút chính.
- [ ] Không layout shift khi đổi màn / khi ResultSheet mở (đặt chiều cao tối thiểu, dùng `next/font`, `next/image` có kích thước).
- [ ] A11y cơ bản: focus ring rõ, `aria-live="polite"` cho kết quả, modal có focus trap + đóng bằng Esc, tương phản chữ ≥ 4.5:1, `prefers-reduced-motion`.
- [ ] Mọi tracking đi qua store (`game_start`, `level_complete`, `game_complete`, `Lead`) — component **không** gọi `fbq`/`gtag` trực tiếp.
- [ ] `layout.tsx`: đổi `lang="en"` → `lang="vi"`, thay metadata mặc định của create-next-app bằng title/description tiếng Việt, nạp font Playfair Display + Plus Jakarta Sans.
- [ ] Meta Pixel & GA4 gắn trong `layout.tsx` bằng `next/script` (`NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_ID`); bỏ qua nếu thiếu biến.
- [ ] Form: hiện lỗi từng field (message từ Zod), honeypot ẩn, nút submit disable khi `SUBMITTING`, hiện `submitError` khi `SUBMIT_ERROR`.
- [ ] Copy tiếng Việt lấy từ dữ liệu/`feedback` của engine; không tự thêm cam kết tuyệt đối.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` sạch; chạy thử đủ luồng 3 màn ở cả hai kết quả (FAIL & PERFECT).
