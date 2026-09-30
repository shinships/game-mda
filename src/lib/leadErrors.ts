import type { LeadErrorCode } from "@/types/game";

/** Thông báo mặc định (tiếng Việt) cho từng mã lỗi lead, dùng chung cho client và server. */
export const LEAD_ERROR_MESSAGES: Record<LeadErrorCode, string> = {
  VALIDATION: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.",
  INCOMPLETE_SELECTIONS: "Bạn chưa hoàn thành đủ các thử thách. Vui lòng chơi lại từ đầu.",
  RATE_LIMITED: "Bạn thao tác hơi nhanh, vui lòng thử lại sau ít phút.",
  UPSTREAM: "Hệ thống đang bận, chưa ghi nhận được thông tin. Vui lòng thử lại.",
  NETWORK: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  SERVER: "Có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.",
  INVALID_STATE: "Không thể gửi thông tin ở bước này.",
};
