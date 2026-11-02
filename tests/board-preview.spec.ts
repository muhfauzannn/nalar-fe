import { expect, test } from "@playwright/test";
import { boardPreviewScale } from "../app/features/lms/world3d/board-preview";

test("landscape slides and portrait pages fit entirely within the board", () => {
  const board = { width: 2048, height: 1210 };
  for (const page of [{ width: 1920, height: 1080 }, { width: 612, height: 792 }, { width: 4000, height: 500 }]) {
    const scale = boardPreviewScale(board.width, board.height, page.width, page.height);
    expect(page.width * scale).toBeLessThanOrEqual(board.width * 0.9);
    expect(page.height * scale).toBeLessThanOrEqual(board.height * 0.86);
    expect(scale).toBeGreaterThan(0);
  }
});
