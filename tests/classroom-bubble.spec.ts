import { expect, test, type Page } from "@playwright/test";

// The tutor's dock floats over the bottom of the classroom and moves nothing: opening, expanding and
// closing it leaves each station (lab bench, quiz board, task book) exactly where and as big as it was,
// with its content laid out the same. While it is open the station can scroll a little past its end, so
// whatever is at the bottom can be scrolled up above the dock. The PDF board has the same behaviour and
// its own test (board-study.spec.ts).

// The room flies the camera to the station before its surface appears.
const SETTLE = { timeout: 30_000 };

const stations = [
  ["the lab bench", "station=lab&lab=mesin-gelombang"],
  ["the quiz board", "station=kuis"],
  ["the task book", "station=tugas&pos=2"],
] as const;

const screens = [
  ["a desktop", { width: 1280, height: 960 }],
  ["a tablet", { width: 768, height: 1024 }],
  ["a phone", { width: 390, height: 844 }],
] as const;

/** What a station looks like: its surface and what the surface holds. */
async function layout(page: Page) {
  return page.locator("[data-classroom-surface]").evaluate((surface) => {
    const box = (element: Element | null) => {
      const rect = element?.getBoundingClientRect();
      return rect ? [rect.x, rect.y, rect.width, rect.height].map(Math.round) : null;
    };
    return { surface: box(surface), content: box(surface.firstElementChild) };
  });
}

/** How far the station can scroll (0 when everything fits). */
const scrollRoom = (page: Page) =>
  page.locator("[data-classroom-surface]").evaluate((surface) => surface.scrollHeight - surface.clientHeight);

for (const [station, search] of stations) {
  for (const [screen, viewport] of screens) {
    test(`the open dock moves nothing in ${station} on ${screen}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.goto(`/tests/fixtures/classroom.html?${search}`);
      const surface = page.locator("[data-classroom-surface]");
      await expect(surface).toBeVisible(SETTLE);
      await expect(surface).not.toHaveAttribute("aria-busy", "true", SETTLE);
      // the surface moves while the camera settles; wait for it to rest
      let rest = JSON.stringify(await layout(page));
      await expect
        .poll(async () => {
          const now = JSON.stringify(await layout(page));
          const same = now === rest;
          rest = now;
          return same;
        })
        .toBe(true);
      const before = await layout(page);
      const roomBefore = await scrollRoom(page);

      await page.getByRole("button", { name: "Panggil tutor" }).click();
      const dock = page.getByRole("region", { name: "Tutor AI" });
      await expect(dock).toBeVisible();
      // The dock rises in with a transform; look at it once it has settled.
      await expect.poll(() => dock.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
      expect(await dock.evaluate((element) => getComputedStyle(element).position)).toBe("absolute");
      const slim = (await dock.boundingBox())!;
      expect(slim.height).toBeLessThan(viewport.height * 0.25);
      expect(slim.y + slim.height).toBeGreaterThan(viewport.height - 40);
      // ... and it stays that way a moment later, nothing chasing anything
      await page.waitForTimeout(500);
      expect(await layout(page)).toEqual(before);
      // Scrolled to its end, the station has its content up above the dock (some have room to spare already).
      const clear = await surface.evaluate((element, top) => {
        element.scrollTo(0, element.scrollHeight);
        const content = element.firstElementChild!.getBoundingClientRect();
        element.scrollTo(0, 0);
        return content.bottom <= top + 1;
      }, slim.y);
      expect(clear).toBe(true);

      // Expanding it (when there is a conversation to show) changes only the dock.
      const expand = dock.getByRole("button", { name: "Perluas percakapan" });
      if (await expand.count()) {
        await expand.click();
        await expect(dock.getByRole("button", { name: "Ciutkan percakapan" })).toHaveAttribute("aria-expanded", "true");
        expect(await layout(page)).toEqual(before);
        await dock.getByRole("button", { name: "Ciutkan percakapan" }).click();
      }

      await dock.getByRole("button", { name: "Tutup tutor" }).click();
      await expect(dock).toHaveCount(0);
      expect(await layout(page)).toEqual(before);
      expect(await scrollRoom(page)).toBe(roomBefore);
      expect(errors).toEqual([]);
    });
  }
}
