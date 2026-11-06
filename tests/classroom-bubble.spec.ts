import { expect, test, type Page } from "@playwright/test";

// The tutor spirit's bubble floats over the classroom. Each station (lab, quiz, task book) has to
// make room for it, so what the student works on is never under the bubble: beside it on a wide
// screen, above it where the bubble docks to the bottom (under 768px). The PDF board has the same
// behaviour and its own tests (board-study.spec.ts).

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

// The room flies the camera to the station before its surface appears.
const SETTLE = { timeout: 30_000 };

const stations = [
  ["the lab bench", "lab", "station=lab&lab=mesin-gelombang"],
  ["the quiz board", "kuis", "station=kuis"],
  ["the task book", "tugas", "station=tugas&pos=2"],
] as const;

const screens = [
  ["a desktop", { width: 1280, height: 960 }],
  ["a tablet", { width: 768, height: 1024 }],
  ["a phone", { width: 390, height: 844 }],
] as const;

async function openStation(page: Page, search: string, viewport: { width: number; height: number }) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize(viewport);
  await page.goto(`/tests/fixtures/classroom.html?${search}`);
  const surface = page.locator("[data-classroom-surface]");
  await expect(surface).toBeVisible(SETTLE);
  await expect(surface).not.toHaveAttribute("aria-busy", "true", SETTLE);
  return { errors, surface };
}

for (const [station, focus, search] of stations) {
  for (const [screen, viewport] of screens) {
    test(`the open bubble leaves ${station} uncovered on ${screen}`, async ({ page }) => {
      const { errors, surface } = await openStation(page, search, viewport);
      // the surface moves while the camera settles; wait for it to rest before taking its full size
      let rest = (await surface.boundingBox())!;
      await expect
        .poll(async () => {
          const now = (await surface.boundingBox())!;
          const same = now.x === rest.x && now.y === rest.y && now.width === rest.width && now.height === rest.height;
          rest = now;
          return same;
        })
        .toBe(true);
      const wide = rest;

      await page.getByRole("button", { name: "Panggil tutor" }).click();
      const bubbleBox = page.getByRole("region", { name: "Tutor AI" });
      await expect(bubbleBox).toBeVisible();
      // The bubble grows in with a transform; measure it once it has settled.
      await expect.poll(() => bubbleBox.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
      const bubble = (await bubbleBox.boundingBox())!;

      // The surface gives up the strip under the bubble: it no longer overlaps it, and is still big enough to work in.
      await expect.poll(async () => overlap((await surface.boundingBox())!, bubble)).toBe(false);
      const shrunk = (await surface.boundingBox())!;
      expect(shrunk.width).toBeGreaterThanOrEqual(240);
      expect(shrunk.height).toBeGreaterThanOrEqual(200);
      expect(shrunk.width < wide.width || shrunk.height < wide.height).toBe(true);
      // ... and it stays that size: measuring the bubble and resizing the surface must not chase each other.
      for (let sample = 0; sample < 5; sample++) {
        await page.waitForTimeout(200);
        const again = (await surface.boundingBox())!;
        expect([again.x, again.y, again.width, again.height]).toEqual([shrunk.x, shrunk.y, shrunk.width, shrunk.height]);
      }
      // The part of the station that is on screen is the whole of what the surface holds, side to side.
      expect(await surface.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

      // Closing the bubble gives the room back.
      await bubbleBox.getByRole("button", { name: "Tutup tutor" }).click();
      await expect(bubbleBox).toHaveCount(0);
      await expect.poll(async () => (await surface.boundingBox())!.width).toBeCloseTo(wide.width, 0);
      await expect.poll(async () => (await surface.boundingBox())!.height).toBeCloseTo(wide.height, 0);
      expect(errors).toEqual([]);
    });
  }
}

test("a bubble opened before the surface is there still makes room once it appears", async ({ page }) => {
  // Open the bubble the moment the station is entered, while the camera is still flying.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/tests/fixtures/classroom.html?station=lab&lab=mesin-gelombang");
  await page.getByRole("button", { name: "Panggil tutor" }).click(SETTLE);
  const surface = page.locator("[data-classroom-surface=lab]");
  await expect(surface).toBeVisible(SETTLE);
  const bubbleBox = page.getByRole("region", { name: "Tutor AI" });
  await expect(bubbleBox).toBeVisible();
  await expect.poll(() => bubbleBox.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  const bubble = (await bubbleBox.boundingBox())!;
  await expect.poll(async () => overlap((await surface.boundingBox())!, bubble), SETTLE).toBe(false);
  expect(errors).toEqual([]);
});
