import type { MaterialId, MaterialOption, SlotKey, TagTone } from "@/types/game";

/**
 * Catalog vật liệu: nhãn, mô tả, thông số kỹ thuật, chỉ số chi phí, tông màu tag.
 * Nội dung kỹ thuật cần KTS/sale duyệt lại: xem docs/content-review.md.
 */

/** Mã màu tag (spec 4.1). Codex dùng trực tiếp, không hard-code lại. */
export const TAG_TONES: Record<TagTone, { bg: string; text: string }> = {
  green: { bg: "#E8F5E9", text: "#2E7D32" }, // MDF lõi xanh
  orange: { bg: "#FFF3E0", text: "#E65100" }, // Ván dăm thường
  blue: { bg: "#E1F5FE", text: "#0277BD" }, // PVC/WPB
  slate: { bg: "#ECEFF1", text: "#455A64" }, // HDF
  sand: { bg: "#F5EFE6", text: "#8A6D3B" }, // Plywood, bề mặt, nẹp
};

const CORES: MaterialOption<"core">[] = [
  {
    id: "MFC_STANDARD",
    slot: "core",
    label: "Ván dăm MFC thường",
    shortLabel: "MFC",
    description:
      "Ván dăm ép phủ Melamine, giá mềm, hợp khu vực khô ráo. Hút ẩm nhanh nên mép dễ trương nở khi gặp nước.",
    specTags: [
      { label: "Giá kinh tế", kind: "positive" },
      { label: "Kỵ ẩm", kind: "caution" },
      { label: "Độ cứng thấp", kind: "caution" },
    ],
    costIndex: 1,
    tagTone: "orange",
  },
  {
    id: "MDF_MOISTURE_RESISTANT",
    slot: "core",
    label: "MDF lõi xanh chống ẩm",
    shortLabel: "MDF lõi xanh",
    description:
      "Ván sợi mật độ trung bình, lõi xanh có phụ gia chống ẩm. Bề mặt mịn, mức phát thải Formaldehyde thấp (chuẩn E1).",
    specTags: [
      { label: "Chuẩn E1", kind: "positive" },
      { label: "Chống ẩm", kind: "positive" },
      { label: "Bề mặt mịn", kind: "positive" },
    ],
    costIndex: 2,
    tagTone: "green",
  },
  {
    id: "HDF_COMPACT",
    slot: "core",
    label: "HDF siêu nén",
    shortLabel: "HDF",
    description:
      "Ván sợi mật độ cao, nén chặt nên cứng, phẳng và bám vít tốt; ổn định hơn MDF trên các mặt phẳng lớn.",
    specTags: [
      { label: "Mật độ cao", kind: "positive" },
      { label: "Cứng, phẳng", kind: "positive" },
      { label: "Giá cao hơn MDF", kind: "neutral" },
    ],
    costIndex: 3,
    tagTone: "slate",
  },
  {
    id: "PVC_WPB",
    slot: "core",
    label: "Nhựa PVC/WPB (foam)",
    shortLabel: "PVC/WPB",
    description:
      "Tấm nhựa PVC foam không hút nước, không mối mọt: lựa chọn hàng đầu cho khu vực ẩm ướt thường xuyên. Giá cao, giãn nở nhiệt lớn hơn ván gỗ.",
    specTags: [
      { label: "Không hút nước", kind: "positive" },
      { label: "Chống mối mọt", kind: "positive" },
      { label: "Giá cao", kind: "caution" },
    ],
    costIndex: 5,
    tagTone: "blue",
  },
  {
    id: "PLYWOOD",
    slot: "core",
    label: "Ván ép Plywood",
    shortLabel: "Plywood",
    description:
      "Nhiều lớp gỗ mỏng ép vuông góc thớ: chịu lực và bám vít tốt. Loại keo ép quyết định mức phát thải và khả năng chịu ẩm.",
    specTags: [
      { label: "Chịu lực tốt", kind: "positive" },
      { label: "Cần chọn keo chuẩn", kind: "caution" },
      { label: "Giá khá cao", kind: "neutral" },
    ],
    costIndex: 4,
    tagTone: "sand",
  },
];

const SURFACES: MaterialOption<"surface">[] = [
  {
    id: "MELAMINE",
    slot: "surface",
    label: "Melamine",
    shortLabel: "Melamine",
    description:
      "Giấy trang trí tẩm nhựa Melamine ép lên cốt gỗ: nhiều màu, nhiều vân, chống trầy mức khá, giá tốt.",
    specTags: [
      { label: "Giá tốt", kind: "positive" },
      { label: "Đa dạng vân", kind: "positive" },
      { label: "Chống trầy khá", kind: "neutral" },
    ],
    costIndex: 1,
    tagTone: "sand",
  },
  {
    id: "LAMINATE",
    slot: "surface",
    label: "Laminate (HPL)",
    shortLabel: "Laminate",
    description:
      "Nhiều lớp giấy kraft ép nhiệt áp cao: cứng, chịu va đập, chịu nhiệt và chống thấm bề mặt tốt hơn Melamine.",
    specTags: [
      { label: "Chịu va đập", kind: "positive" },
      { label: "Chịu nhiệt", kind: "positive" },
      { label: "Dễ vệ sinh", kind: "positive" },
    ],
    costIndex: 2,
    tagTone: "sand",
  },
  {
    id: "ACRYLIC",
    slot: "surface",
    label: "Acrylic bóng gương",
    shortLabel: "Acrylic",
    description:
      "Bề mặt bóng như gương, màu sâu, không thấm nước và dễ lau chùi. Thẩm mỹ cao nhưng dễ lộ vết xước nếu không bảo quản kỹ.",
    specTags: [
      { label: "Bóng gương", kind: "positive" },
      { label: "Không thấm nước", kind: "positive" },
      { label: "Dễ lộ vết xước", kind: "caution" },
    ],
    costIndex: 3,
    tagTone: "sand",
  },
  {
    id: "VENEER",
    slot: "surface",
    label: "Veneer gỗ tự nhiên",
    shortLabel: "Veneer",
    description:
      "Lớp gỗ tự nhiên lạng mỏng dán lên cốt, cho vân gỗ thật ấm áp. Cần sơn phủ bảo vệ, kỵ ẩm và giá cao.",
    specTags: [
      { label: "Vân gỗ thật", kind: "positive" },
      { label: "Kỵ ẩm", kind: "caution" },
      { label: "Giá cao", kind: "caution" },
    ],
    costIndex: 4,
    tagTone: "sand",
  },
];

const EDGES: MaterialOption<"edge">[] = [
  {
    id: "EVA_STANDARD",
    slot: "edge",
    label: "Nẹp dán keo EVA",
    shortLabel: "Keo EVA",
    description:
      "Nẹp PVC dán bằng keo EVA nóng chảy: giá tốt, thi công nhanh. Đường keo có thể lộ viền tối và bong mép khi gặp hơi ẩm hoặc nhiệt.",
    specTags: [
      { label: "Giá tốt", kind: "positive" },
      { label: "Lộ đường keo", kind: "caution" },
      { label: "Kém chịu ẩm", kind: "caution" },
    ],
    costIndex: 1,
    tagTone: "sand",
  },
  {
    id: "PUR_NOLINE",
    slot: "edge",
    label: "Nẹp PUR No-line",
    shortLabel: "PUR No-line",
    description:
      "Keo PUR bám chắc, gần như không thấy đường keo. Bịt kín mép nên ngăn hơi ẩm thấm vào cốt ván.",
    specTags: [
      { label: "Không lộ đường keo", kind: "positive" },
      { label: "Bịt kín mép", kind: "positive" },
      { label: "Bền với ẩm", kind: "positive" },
    ],
    costIndex: 3,
    tagTone: "sand",
  },
  {
    id: "ALUMINUM_FRAME",
    slot: "edge",
    label: "Khung nhôm",
    shortLabel: "Khung nhôm",
    description:
      "Viền/khung nhôm bao mép: cứng cáp, phong cách hiện đại, thường đi với cánh kính. Mép vẫn lộ khung, không liền mạch như PUR.",
    specTags: [
      { label: "Cứng cáp", kind: "positive" },
      { label: "Phong cách hiện đại", kind: "neutral" },
      { label: "Lộ khung", kind: "neutral" },
    ],
    costIndex: 3,
    tagTone: "sand",
  },
];

/** Danh sách theo lớp, đúng thứ tự người chơi chọn: Cốt → Bề mặt → Nẹp. */
export const MATERIALS_BY_SLOT: {
  core: MaterialOption<"core">[];
  surface: MaterialOption<"surface">[];
  edge: MaterialOption<"edge">[];
} = { core: CORES, surface: SURFACES, edge: EDGES };

export const MATERIALS: MaterialOption[] = [...CORES, ...SURFACES, ...EDGES];

/** Thứ tự các lớp khi chọn. */
export const SLOT_ORDER: readonly SlotKey[] = ["core", "surface", "edge"];

export const SLOT_LABELS: Record<SlotKey, string> = {
  core: "Cốt ván",
  surface: "Bề mặt",
  edge: "Nẹp cạnh",
};

const BY_ID = new Map<MaterialId, MaterialOption>(MATERIALS.map((m) => [m.id, m]));

/** Tra vật liệu theo id. Throw nếu id không tồn tại (lỗi dữ liệu). */
export function getMaterial(id: MaterialId): MaterialOption {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Không tìm thấy vật liệu: ${id}`);
  return found;
}

/** `true` nếu `value` là id hợp lệ của đúng slot `slot`. */
export function isMaterialForSlot(slot: SlotKey, value: unknown): value is MaterialId {
  return (
    typeof value === "string" &&
    MATERIALS_BY_SLOT[slot].some((m) => m.id === value)
  );
}

