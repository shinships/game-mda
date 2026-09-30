import { getScenario } from "@/data/scenarios";
import type {
  CoreMaterial,
  EdgeBanding,
  PlayerSelection,
  RoomScenario,
  SurfaceMaterial,
} from "@/types/game";

export function scenario(id: string): RoomScenario {
  const found = getScenario(id);
  if (!found) throw new Error(`Thiếu scenario ${id}`);
  return found;
}

export function pick(
  core: CoreMaterial,
  surface: SurfaceMaterial,
  edge: EdgeBanding,
): PlayerSelection {
  return { core, surface, edge };
}
