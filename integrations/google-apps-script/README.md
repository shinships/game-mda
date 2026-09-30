# Google Sheets webhook cho lead

Next.js (`POST /api/lead`) gửi mỗi lead tới một **web app Google Apps Script**; script ghi thêm một dòng vào Google Sheets
và đánh dấu SĐT trùng. Không cần server riêng, không cần Google Cloud project.

```
Người chơi → POST /api/lead (Next.js, chấm lại điểm, sinh voucher) → POST Apps Script (kèm SECRET) → Google Sheets
```

## Cài đặt (khoảng 5 phút)

1. Tạo Google Sheets mới, ví dụ **"MDA Game Leads"**.
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xoá nội dung mặc định, dán toàn bộ [`Code.gs`](./Code.gs).
4. (Khuyến nghị) **Cài đặt dự án → Hiện tệp kê khai `appsscript.json`**, dán nội dung [`appsscript.json`](./appsscript.json) để đặt múi giờ `Asia/Ho_Chi_Minh` và quyền web app.
5. **Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính**:
   - `SECRET` = một chuỗi dài, ngẫu nhiên (ví dụ chạy `openssl rand -hex 32`). **Bắt buộc.**
   - `SHEET_NAME` = tên tab (tùy chọn, mặc định `Leads`).
6. Chọn hàm `testAppend` → **Chạy** → cấp quyền khi được hỏi. Kiểm tra tab `Leads` có dòng mẫu (xoá dòng này sau khi thử).
7. **Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web**
   - *Thực thi với tư cách*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai** (bảo vệ bằng `SECRET`, không phải bằng đăng nhập)
   - Bấm **Triển khai**, sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
8. Đặt biến môi trường cho Next.js (`.env.local` khi chạy local, Project Settings → Environment Variables trên Vercel):

   ```
   GOOGLE_SHEETS_WEBHOOK_URL=<URL ở bước 7>
   WEBHOOK_SECRET=<đúng chuỗi SECRET ở bước 5>
   ```

## Kiểm tra bằng curl

```bash
curl -L -X POST "$GOOGLE_SHEETS_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"secret":"<SECRET>","name":"Test","phone":"0912345678","averageScore":90,"levelScores":{"sink_cabinet":100,"kids_bedroom":90,"living_wall":80},"rankTitle":"KTS Thông Thái","voucherCode":"MDA-KTS-TEST22","voucherValue":5000000}'
```

Kết quả mong đợi: `{"ok":true,"duplicate":false}`. Sai secret → `{"ok":false,"error":"UNAUTHORIZED"}`.
Cờ `-L` là bắt buộc vì Apps Script trả HTTP 302 sang nơi chứa kết quả (`fetch` trong Node tự theo redirect).

## Các cột

`Thời gian · Họ tên · SĐT (Zalo) · Dự án · Điểm TB · Điểm màn 1/2/3 · Rank · Mã voucher · Giá trị voucher · utm_source/medium/campaign/term/content · fbclid · gclid · Thời gian chơi (giây) · Trùng SĐT · Nghi giả điểm · Ghi chú sale`

- **Trùng SĐT**: so sánh theo chữ số (`0912…` và `+84 912…` coi như một). Dòng trùng được tô vàng và ghi `TRÙNG (lần N)`; lead vẫn được lưu để sale quyết định.
- **Nghi giả điểm**: `CÓ` nếu điểm client báo lên khác điểm server tự chấm (voucher vẫn cấp theo điểm server).
- Cột SĐT được đặt định dạng văn bản để không mất số `0` đầu. Mọi ô văn bản bắt đầu bằng `= + - @` được thêm dấu `'` để chống chèn công thức.

## Lưu ý vận hành

- **Sửa code xong phải deploy lại**: Triển khai → Quản lý triển khai → biểu tượng bút → *Phiên bản mới* → Triển khai. URL giữ nguyên.
- Thứ tự cột gắn với `HEADERS` và `LEVEL_IDS` trong `Code.gs`. Thêm màn chơi mới ở `scenarios.json` thì cập nhật `LEVEL_IDS` và thêm cột ở **cuối** bảng.
- Nếu Sheets trả HTML thay vì JSON, thường do quyền truy cập chưa để **Bất kỳ ai**; Next.js sẽ báo `Webhook không trả JSON`.
- Apps Script có hạn mức chạy hằng ngày (tài khoản Gmail thường ~20.000 lượt gọi/ngày) — dư sức cho một chiến dịch Ads; theo dõi nếu chạy quy mô lớn.
- Khi webhook lỗi, API trả `502` và **không** cấp voucher để người chơi thử lại (không mất lead).
- Không có `GOOGLE_SHEETS_WEBHOOK_URL`: API chạy **mock**, chỉ log ra console máy chủ (đã che tên/SĐT).
