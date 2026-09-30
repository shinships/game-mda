# Nội dung cần KTS / sale duyệt

Các nội dung kỹ thuật và thương hiệu trong game do AI soạn từ spec, **chưa qua duyệt chuyên môn**. Duyệt xong thì đánh dấu `[x]` và ghi tên người duyệt.

## Số liệu & cam kết kỹ thuật

- [ ] **Formaldehyde E1 / CARB P2** — spec ghi "dưới 0.1ppm". E1 (EN 717-1) ≈ 0,124 mg/m³ (~0,1 ppm); ngưỡng CARB P2 khác nhau theo loại ván (MDF ≈ 0,11 ppm, ván dăm ≈ 0,09 ppm, plywood ≈ 0,05 ppm). Game **không nêu con số**, chỉ nói "phát thải thấp (chuẩn E1/CARB P2)". Cần xác nhận với phiếu chứng nhận của nhà cung cấp (An Cường…) trước khi nêu số.
- [ ] **Đã làm mềm cam kết tuyệt đối** so với spec: "an toàn tuyệt đối" → "an toàn hơn"; "chống nước 100%" → "không hút nước"; "độ ẩm lên tới 90%" → bỏ con số. Xác nhận cách diễn đạt.
- [ ] **PVC/WPB giãn nở nhiệt** (`wall_pvc_thermal`, màn 3): khẳng định PVC foam giãn nở nhiệt lớn hơn ván gỗ nên vách TV 3m tỏa nhiệt có nguy cơ nhấp nhô. Cần KTS xác nhận mức độ thực tế.
- [ ] **Phân loại ideal/acceptable** (xem `src/data/scenarios.json`): plywood & HDF "chấp nhận được" ở khoang chậu rửa; khung nhôm "chấp nhận được" ở chậu rửa & vách TV; HDF hoặc MDF lõi xanh đều "ideal" cho vách TV; MFC bị trừ ở phòng trẻ (`kids_mfc_core`). Xác nhận đúng với thực tế thi công của Minh Đức.
- [ ] **`HDF_COMPACT`**: spec không giải thích. Game hiểu là **HDF siêu nén** (ván sợi mật độ cao), không phải Compact HPL. Xác nhận.
- [ ] **Chỉ số chi phí (`costIndex` 1–5)** và trần "quá tay" ở màn phòng trẻ (tổng > 7 bị trừ 5 điểm): ước lượng tương đối, cần sale chỉnh theo bảng giá thực.

## Thương hiệu & ưu đãi

- [ ] **"Minh Long" ở TrustSection** (spec 4.2): Minh Long là thương hiệu gốm sứ, không phải vật liệu gỗ công nghiệp. Xác nhận thương hiệu đúng (An Cường? Blum? Hafele?) trước khi Codex đưa lên landing.
- [ ] **Điều kiện áp dụng voucher**: spec chỉ ghi giá trị (5tr / 3tr / 1tr). Chưa có hạn dùng, giá trị hợp đồng tối thiểu, áp dụng cho thiết kế hay thi công, cộng dồn với ưu đãi khác hay không. Cần sale bổ sung để hiển thị ở màn Thank You.
- [ ] **Cẩm nang** tặng kèm rank "Học Việc Triển Vọng": chưa có file/link cẩm nang. Cần bổ sung.
- [ ] **Đồng ý liên hệ**: câu chữ checkbox đồng ý nhận liên hệ/xử lý dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) cần pháp lý duyệt trước khi chạy Ads.
