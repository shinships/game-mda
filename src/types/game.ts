// =============================================================================
// Type toàn bộ game. Phần đầu giữ nguyên spec gốc (mục 3.1); phần "mở rộng" là bổ sung của dự án.
// =============================================================================

export type CoreMaterial =
  | "MFC_STANDARD"
  | "MDF_MOISTURE_RESISTANT"
  | "HDF_COMPACT"
  | "PVC_WPB"
  | "PLYWOOD";
export type SurfaceMaterial = "MELAMINE" | "LAMINATE" | "ACRYLIC" | "VENEER";
export type EdgeBanding = "EVA_STANDARD" | "PUR_NOLINE" | "ALUMINUM_FRAME";

export type Zone = "KITCHEN_SINK" | "BEDROOM_KIDS" | "LIVING_WALL";
export type BudgetTier = "BUDGET" | "STANDARD" | "PREMIUM";
export type VisualEffect =
  | "BULGING_EDGES"
  | "SCRATCHED"
  | "PERFECT_GLOSS"
  | "WARPING";
export type EvaluationStatus = "FAIL" | "PASS" | "PERFECT";

// -----------------------------------------------------------------------------
// Mở rộng: khái niệm "lớp vật liệu" (slot)
// -----------------------------------------------------------------------------

/** 3 lớp người chơi phải chọn, theo thứ tự chọn. */
export type SlotKey = "core" | "surface" | "edge";

/** Map slot → kiểu giá trị hợp lệ của slot đó. */
export interface SlotValueMap {
  core: CoreMaterial;
  surface: SurfaceMaterial;
  edge: EdgeBanding;
}

export type MaterialId = SlotValueMap[SlotKey];

/** Tổ hợp vật liệu dạng danh sách (mỗi slot có thể có nhiều giá trị chấp nhận). */
export interface MaterialCombination {
  core: CoreMaterial[];
  surface: SurfaceMaterial[];
  edge: EdgeBanding[];
}

// -----------------------------------------------------------------------------
// Mở rộng: catalog vật liệu (src/data/materials.ts)
// -----------------------------------------------------------------------------

/** Tông màu tag, ánh xạ sang mã màu ở `TAG_TONES`. */
export type TagTone = "green" | "orange" | "blue" | "slate" | "sand";

/** Sắc thái của một thông số kỹ thuật, để UI tô màu icon/chữ. */
export type SpecTagKind = "positive" | "neutral" | "caution";

export interface SpecTag {
  label: string;
  kind: SpecTagKind;
}

export interface MaterialOption<S extends SlotKey = SlotKey> {
  id: SlotValueMap[S];
  slot: S;
  /** Tên đầy đủ, ví dụ "MDF lõi xanh chống ẩm". */
  label: string;
  /** Tên ngắn dùng trong thẻ/chip, ví dụ "MDF lõi xanh". */
  shortLabel: string;
  description: string;
  specTags: SpecTag[];
  /** Mức chi phí tương đối 1 (rẻ) → 5 (đắt). Dùng cho luật "quá tay" ở màn BUDGET. */
  costIndex: 1 | 2 | 3 | 4 | 5;
  tagTone: TagTone;
}

// -----------------------------------------------------------------------------
// Màn chơi (scenario)
// -----------------------------------------------------------------------------

/**
 * Luật trừ điểm dạng dữ liệu. Luật kích hoạt khi TẤT CẢ slot khai báo trong `when` khớp
 * (trong một slot: khớp BẤT KỲ giá trị nào trong danh sách; slot không khai báo = bỏ qua).
 */
export interface PenaltyRule {
  id: string;
  when: Partial<MaterialCombination>;
  /** Số điểm bị trừ (≥ 0). */
  penalty: number;
  /** Hiệu ứng stress-test gắn với lỗi này. */
  visualEffect: VisualEffect;
  /** Câu giải thích hiển thị cho người chơi. */
  message: string;
  /** Nếu có, tổng điểm không vượt quá giá trị này khi luật kích hoạt. */
  capScore?: number;
}

export interface RoomScenario {
  id: string;
  level: number;
  title: string;
  zone: Zone;
  customerDemand: string;
  budgetTier: BudgetTier;
  /** Lựa chọn tối ưu: đạt 100% điểm của lớp đó. */
  idealCombination: MaterialCombination;
  /** Mở rộng: lựa chọn dùng được nhưng chưa tối ưu: đạt 50% điểm của lớp đó. */
  acceptableCombination: MaterialCombination;
  technicalRules: {
    /** Cốt gỗ bị cấm ở khu vực này: 0 điểm lớp cốt, giới hạn tổng điểm, kích hoạt `forbiddenEffect`. */
    forbiddenCores: CoreMaterial[];
    /** Mở rộng: hiệu ứng khi chọn cốt bị cấm. Mặc định `BULGING_EDGES`. */
    forbiddenEffect?: VisualEffect;
    warningMessage?: string;
    perfectExplanation: string;
  };
  /** Mở rộng: luật trừ điểm bổ sung (bề mặt/nẹp không hợp khu vực…). */
  penaltyRules: PenaltyRule[];
  /** Mở rộng: mẹo chuyên gia hiển thị khi người chơi đã phối đúng. */
  expertTip: string;
  /** Mở rộng: lời khuyên khi chọn "quá tay" so với ngân sách (chỉ dùng cho tier BUDGET). */
  budgetNote?: string;
}

export interface PlayerSelection {
  core: CoreMaterial | null;
  surface: SurfaceMaterial | null;
  edge: EdgeBanding | null;
}

/** Lựa chọn đã đầy đủ 3 lớp (đầu vào hợp lệ của evaluator). */
export type CompleteSelection = { [K in SlotKey]: SlotValueMap[K] };

export type SlotVerdict = "IDEAL" | "ACCEPTABLE" | "NEUTRAL" | "FORBIDDEN";

/** Mở rộng: chi tiết điểm từng lớp, để UI hiển thị thanh điểm theo lớp. */
export interface SlotBreakdown {
  slot: SlotKey;
  material: MaterialId;
  verdict: SlotVerdict;
  points: number;
  maxPoints: number;
}

/** Mở rộng: một luật trừ điểm đã kích hoạt. */
export interface AppliedPenalty {
  id: string;
  points: number;
  message: string;
}

export interface EvaluationResult {
  score: number; // 0 - 100
  stars: 1 | 2 | 3 | 4 | 5;
  status: EvaluationStatus;
  visualEffect: VisualEffect;
  feedback: {
    headline: string;
    explanation: string;
    expertTip: string;
  };
  /** Mở rộng: điểm từng lớp (thứ tự core, surface, edge). */
  breakdown: SlotBreakdown[];
  /** Mở rộng: các luật trừ điểm đã kích hoạt (không gồm phạt "quá tay"). */
  penalties: AppliedPenalty[];
  /** Mở rộng: true nếu chọn quá tay ở màn BUDGET (bị trừ nhẹ). */
  overspent: boolean;
  /** Mở rộng: lời khuyên ngân sách, chỉ có khi `overspent`. */
  budgetNote?: string;
}

// =============================================================================
// Mở rộng: state machine
// =============================================================================

export type GamePhase =
  | "INTRO"
  | "BRIEF"
  | "SELECTING"
  | "TESTING"
  | "RESULT"
  | "SUMMARY"
  | "LEAD_FORM"
  | "SUBMITTING"
  | "SUCCESS"
  | "SUBMIT_ERROR";

// =============================================================================
// Mở rộng: rank & voucher
// =============================================================================

export type RankId =
  | "KTS_THONG_THAI"
  | "THO_CA_TINH_MAT"
  | "HOC_VIEC_TRIEN_VONG";

export interface RankTier {
  id: RankId;
  title: string;
  /** Điểm trung bình tối thiểu (bao gồm) để đạt rank này. */
  minScore: number;
  /** Giá trị voucher, đơn vị VND. */
  voucherValue: number;
  /** Nhãn hiển thị, ví dụ "5.000.000đ". */
  voucherLabel: string;
  /** Mã ngắn chèn vào mã voucher: MDA-<voucherCodePart>-XXXXXX. */
  voucherCodePart: string;
  description: string;
  /** Quà kèm theo (rank thấp nhất tặng cẩm nang). */
  bonus?: string;
}

// =============================================================================
// Mở rộng: lead
// =============================================================================

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string;
  gclid?: string;
}

/** Giá trị người dùng nhập ở form nhận quà (schema: `leadFormSchema`). */
export interface LeadFormValues {
  name: string;
  phone: string;
  project?: string;
  consent: boolean;
  /** Honeypot: người thật luôn để trống. */
  website?: string;
}

/** Payload store gửi lên `POST /api/lead`. Server bỏ qua mọi điểm số client gửi kèm. */
export interface LeadPayload extends LeadFormValues {
  /** scenarioId → lựa chọn 3 lớp. Server dùng để tự chấm lại. */
  selections: Record<string, PlayerSelection>;
  /** Chỉ để đối chiếu/log; KHÔNG dùng để tính rank. */
  clientScore?: number;
  durationMs?: number;
  utm?: UtmParams;
}

export interface LeadSuccessResponse {
  ok: true;
  voucherCode: string;
  rank: { id: RankId; title: string };
  voucherValue: number;
  voucherLabel: string;
  averageScore: number;
  /** Lấy từ NEXT_PUBLIC_ZALO_OA_URL; `null` nếu chưa cấu hình. */
  zaloUrl: string | null;
}

export type LeadErrorCode =
  | "VALIDATION"
  | "INCOMPLETE_SELECTIONS"
  | "RATE_LIMITED"
  | "UPSTREAM"
  | "NETWORK"
  | "SERVER"
  | "INVALID_STATE";

export interface LeadErrorResponse {
  ok: false;
  error: LeadErrorCode;
  /** Thông báo tiếng Việt, hiển thị thẳng cho người dùng. */
  message: string;
  /** Lỗi theo field khi `error === "VALIDATION"`. */
  fieldErrors?: Record<string, string[]>;
  retryAfterSec?: number;
}

export type LeadSubmitOutcome = LeadSuccessResponse | LeadErrorResponse;
