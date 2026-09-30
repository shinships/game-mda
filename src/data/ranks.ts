import type { RankTier } from "@/types/game";

/**
 * Bảng rank theo điểm trung bình các màn, sắp xếp GIẢM DẦN theo `minScore`.
 * Điều kiện áp dụng voucher (hạn dùng, giá trị hợp đồng tối thiểu…) chưa có trong spec: xem docs/content-review.md.
 */
export const RANKS: readonly RankTier[] = [
  {
    id: "KTS_THONG_THAI",
    title: "KTS Thông Thái",
    minScore: 90,
    voucherValue: 5_000_000,
    voucherLabel: "5.000.000đ",
    voucherCodePart: "KTS",
    description:
      "Bạn phối vật liệu chuẩn như một kiến trúc sư thực thụ: đúng cốt, đúng bề mặt, đúng nẹp cho từng không gian.",
  },
  {
    id: "THO_CA_TINH_MAT",
    title: "Thợ Cả Tinh Mắt",
    minScore: 70,
    voucherValue: 3_000_000,
    voucherLabel: "3.000.000đ",
    voucherCodePart: "THO",
    description:
      "Bạn nắm chắc nguyên tắc chọn vật liệu, chỉ còn vài chi tiết nhỏ để đạt mức chuyên gia.",
  },
  {
    id: "HOC_VIEC_TRIEN_VONG",
    title: "Học Việc Triển Vọng",
    minScore: 0,
    voucherValue: 1_000_000,
    voucherLabel: "1.000.000đ",
    voucherCodePart: "HOC",
    description:
      "Vật liệu nội thất có nhiều điều thú vị hơn bạn nghĩ. Chọn sai cốt hoặc nẹp có thể khiến đồ nội thất xuống cấp chỉ sau vài tháng.",
    bonus: "Tặng kèm cẩm nang chọn vật liệu nội thất gỗ công nghiệp",
  },
];
