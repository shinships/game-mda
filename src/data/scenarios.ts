import type { RoomScenario } from "@/types/game";
import raw from "./scenarios.json";

/**
 * Danh sách màn chơi, sắp xếp theo `level`. Thêm màn mới: chỉ sửa `scenarios.json`;
 * test tính toàn vẹn dữ liệu (src/lib/__tests__/scenarios.test.ts) sẽ kiểm tra shape & cân bằng điểm.
 */
export const SCENARIOS: readonly RoomScenario[] = [
  ...(raw as unknown as RoomScenario[]),
].sort((a, b) => a.level - b.level);

export function getScenario(id: string): RoomScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
