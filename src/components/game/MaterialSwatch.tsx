import type { CSSProperties } from "react";
import type { MaterialId } from "@/types/game";

// Hình thức minh họa; không tham gia đánh giá tính năng vật liệu.
const finishes: Record<MaterialId, { color: string; texture: string }> = {
  MFC_STANDARD: { color: "#bca17c", texture: "chip" },
  MDF_MOISTURE_RESISTANT: { color: "#90a180", texture: "fiber" },
  HDF_COMPACT: { color: "#8a8172", texture: "fiber" },
  PVC_WPB: { color: "#dce4df", texture: "plain" },
  PLYWOOD: { color: "#c5a177", texture: "ply" },
  MELAMINE: { color: "#c6a47f", texture: "wood" },
  LAMINATE: { color: "#b69a78", texture: "wood" },
  ACRYLIC: { color: "#ded7c9", texture: "gloss" },
  VENEER: { color: "#987252", texture: "wood" },
  EVA_STANDARD: { color: "#a78b69", texture: "line" },
  PUR_NOLINE: { color: "#c1a47e", texture: "plain" },
  ALUMINUM_FRAME: { color: "#9ba5a7", texture: "metal" },
};
export function materialStyle(id: MaterialId | null): CSSProperties {
  return {
    "--material-color": id ? finishes[id].color : "#ddd8ce",
  } as CSSProperties;
}
export function materialTexture(id: MaterialId | null) {
  return id ? finishes[id].texture : "empty";
}
export function MaterialSwatch({ id }: { id: MaterialId }) {
  return (
    <span
      className={`material-swatch texture-${materialTexture(id)}`}
      style={materialStyle(id)}
      aria-hidden="true"
    >
      <span />
    </span>
  );
}
