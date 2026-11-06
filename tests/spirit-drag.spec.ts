import { expect, test, type Locator, type Page } from "@playwright/test";

// The tutor spirit at a station can be dragged to whatever part of the screen the student wants to keep clear,
// and its conversation bubble hangs from it wherever it goes. (The PDF board has its own drag test in
// board-study.spec.ts: it needs the PDF tutor's socket.)

// The room flies the camera to the station before its surface appears.
const SETTLE = { timeout: 30_000 };

const stations = [
  ["the lab bench", "station=lab&lab=mesin-gelombang"],
  ["the quiz board", "station=kuis"],
  ["the task book", "station=tugas&pos=2"],
] as const;
const screens = [
  ["a desktop", { width: 1280, height: 960 }],
  ["a phone", { width: 390, height: 844 }],
] as const;

type Box = { x: number; y: number; width: number; height: number };
const centre = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

async function openStation(page: Page, search: string, viewport: { width: number; height: number }) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize(viewport);
  await page.goto(`/tests/fixtures/classroom.html?${search}`);
  const surface = page.locator("[data-classroom-surface]");
  await expect(surface).toBeVisible(SETTLE);
  await expect(surface).not.toHaveAttribute("aria-busy", "true", SETTLE);
  return { errors, spirit: page.locator(".spirit-corner"), dock: page.getByRole("region", { name: "Tutor AI" }) };
}

/** Press on the spirit and drag it to a point, the way a hand would. */
async function dragTo(page: Page, spirit: Locator, to: { x: number; y: number }) {
  const from = centre((await spirit.boundingBox())!);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

const settled = (bubble: Locator) => expect.poll(() => bubble.evaluate((element) => getComputedStyle(element).transform)).toBe("none");

for (const [station, search] of stations) {
  for (const [screen, viewport] of screens) {
    test(`the spirit at ${station} can be dragged, and the bubble hangs from it, on ${screen}`, async ({ page }) => {
      const { errors, spirit, dock } = await openStation(page, search, viewport);
      const home = (await spirit.boundingBox())!;
      await expect(spirit).not.toHaveAttribute("data-moved", "true");

      // Undragged, the bubble is where it always was: right under the spirit, right edges lined up.
      await spirit.click();
      await expect(dock).toBeVisible();
      await settled(dock);
      const first = (await dock.boundingBox())!;
      expect(first.y).toBeGreaterThanOrEqual(home.y + home.height);
      expect(first.x + first.width).toBeCloseTo(home.x + home.width, 0);
      await dock.getByRole("button", { name: "Tutup tutor" }).click();
      await expect(dock).toHaveCount(0);

      // Dragging it low and to the left moves it there, and does not count as a click: the tutor stays closed.
      await dragTo(page, spirit, { x: 120, y: viewport.height - 120 });
      await expect(spirit).toHaveAttribute("data-moved", "true");
      await expect(spirit).toHaveAttribute("aria-expanded", "false");
      await expect(dock).toHaveCount(0);
      const moved = (await spirit.boundingBox())!;
      expect(centre(moved).x).toBeCloseTo(120, -1);
      expect(centre(moved).y).toBeCloseTo(viewport.height - 120, -1);

      // A plain click on it still opens the tutor, and the bubble now stands on top of it, inside the screen.
      await spirit.click();
      await expect(dock).toBeVisible();
      await settled(dock);
      const low = (await dock.boundingBox())!;
      expect(low.y + low.height).toBeLessThanOrEqual(moved.y);
      expect(low.x).toBeGreaterThanOrEqual(0);
      expect(low.x + low.width).toBeLessThanOrEqual(viewport.width);
      expect(low.y).toBeGreaterThanOrEqual(0);
      expect(overlap(low, moved)).toBe(false);

      // Dragging it with the bubble open takes the bubble along: now it hangs below, at the top left.
      await dragTo(page, spirit, { x: 120, y: 120 });
      const high = (await dock.boundingBox())!;
      const top = (await spirit.boundingBox())!;
      await expect.poll(async () => (await dock.boundingBox())!.y).toBeGreaterThanOrEqual(top.y + top.height);
      expect(high.x).toBeGreaterThanOrEqual(0);
      expect(overlap((await dock.boundingBox())!, top)).toBe(false);
      // the tutor is still open: a drag is not a click
      await expect(spirit).toHaveAttribute("aria-expanded", "true");
      expect(errors).toEqual([]);
    });
  }
}

test("the spirit stays on screen when it is dragged past the edges, and keeps its place on the next visit", async ({ page }) => {
  const viewport = { width: 1280, height: 960 };
  const { errors, spirit } = await openStation(page, "station=lab&lab=mesin-gelombang", viewport);
  await dragTo(page, spirit, { x: -400, y: 5000 });
  const edge = (await spirit.boundingBox())!;
  expect(edge.x).toBeGreaterThanOrEqual(0);
  expect(edge.y + edge.height).toBeLessThanOrEqual(viewport.height + 0.5);

  await dragTo(page, spirit, { x: 400, y: 600 });
  await page.waitForTimeout(300); // the press shrinks the spirit a little, and it eases back
  const placed = (await spirit.boundingBox())!;

  // leaving and coming back to a station puts it where it was left, even at another size of screen
  await page.reload();
  const again = page.locator(".spirit-corner");
  await expect(again).toHaveAttribute("data-moved", "true", SETTLE);
  const back = (await again.boundingBox())!;
  expect(Math.abs(back.x - placed.x)).toBeLessThan(1.5);
  expect(Math.abs(back.y - placed.y)).toBeLessThan(1.5);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect
    .poll(async () => {
      const resized = (await again.boundingBox())!;
      return resized.x >= 0 && resized.y >= 0 && resized.x + resized.width <= 800.5 && resized.y + resized.height <= 600.5;
    })
    .toBe(true);
  expect(errors).toEqual([]);
});

test("the spirit can be moved from the keyboard with Alt and the arrow keys", async ({ page }) => {
  const { errors, spirit } = await openStation(page, "station=kuis", { width: 1280, height: 960 });
  const before = (await spirit.boundingBox())!;
  await spirit.focus();
  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.press("Alt+ArrowLeft");
  await page.keyboard.press("Alt+ArrowDown");
  const after = (await spirit.boundingBox())!;
  expect(after.x).toBeCloseTo(before.x - 48, 0);
  expect(after.y).toBeCloseTo(before.y + 24, 0);
  // the arrows alone do not move it, and moving it does not open the tutor
  await page.keyboard.press("ArrowLeft");
  expect((await spirit.boundingBox())!.x).toBeCloseTo(after.x, 0);
  await expect(spirit).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});
