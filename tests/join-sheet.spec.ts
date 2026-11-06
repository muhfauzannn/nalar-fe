import { expect, test, type Page } from "@playwright/test";
import { createServer } from "vite";

let join: typeof import("../app/features/lms/world3d/join");
test.beforeAll(async () => {
  const server = await createServer({ configFile: "tests/vite.config.ts", server: { middlewareMode: true, hmr: false } });
  try {
    join = (await server.ssrLoadModule("/app/features/lms/world3d/join.ts")) as typeof join;
  } finally {
    await server.close();
  }
});

test("the join sheet is a /dunia URL, with the class code when the link carries one", () => {
  expect(join.joinUrl()).toBe("/dunia?gabung=");
  expect(join.joinUrl(" K7M2-QX9P ")).toBe("/dunia?gabung=K7M2-QX9P");
  expect(join.joinUrl(null)).toBe("/dunia?gabung=");
  expect(join.joinSheetOf(new URLSearchParams("gabung"))).toEqual({ code: "" });
  expect(join.joinSheetOf(new URLSearchParams("gabung=K7M2-QX9P"))).toEqual({ code: "K7M2-QX9P" });
  expect(join.joinSheetOf(new URLSearchParams("tempat=lab"))).toBeNull();
  expect(join.joinSheetOf(new URLSearchParams(`gabung=${"X".repeat(80)}`))?.code).toHaveLength(32);
});

const sheet = (page: Page) => page.getByRole("dialog", { name: "Gabung ke course" });
const visit = (page: Page, at = "/dunia") => page.goto(`/tests/fixtures/join-sheet.html?at=${encodeURIComponent(at)}`);
const url = (page: Page) => page.getByTestId("url");

test("the sheet opens over the world with the code field focused", async ({ page }) => {
  await visit(page);
  await expect(sheet(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByLabel("Kode kelas")).toBeFocused();
  await expect(url(page)).toHaveText("/dunia?gabung=");
});

test("an invite link opens the sheet with the code filled in", async ({ page }) => {
  await visit(page, "/dunia?gabung=K7M2-QX9P");
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByLabel("Kode kelas")).toHaveValue("K7M2-QX9P");
});

test("a wrong code is explained in the sheet, which stays open with what was typed", async ({ page }) => {
  await visit(page);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  await page.getByLabel("Kode kelas").fill("SALAH-123");
  await page.getByRole("button", { name: "Gabung", exact: true }).click();
  await expect(page.getByRole("button", { name: "Memeriksa" })).toBeDisabled();
  await expect(page.getByRole("alert")).toHaveText("Kode kelas tidak ditemukan.");
  await expect(page.getByLabel("Kode kelas")).toHaveValue("SALAH-123");
  await expect(page.getByLabel("Kode kelas")).toHaveAttribute("aria-invalid", "true");
  await expect(sheet(page)).toBeVisible();
});

test("a rejection does not wait for the next time the sheet opens", async ({ page }) => {
  await visit(page);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  await page.getByLabel("Kode kelas").fill("SALAH-123");
  await page.getByRole("button", { name: "Gabung", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Tutup" }).click();
  await expect(sheet(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a right code leaves for the course's island and the sheet goes away", async ({ page }) => {
  await visit(page);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  await page.getByLabel("Kode kelas").fill("k7m2-qx9p");
  await page.getByRole("button", { name: "Gabung", exact: true }).click();
  await expect(page.getByText("Kelas Fisika")).toBeVisible();
  await expect(sheet(page)).toHaveCount(0);
});

test("closing a sheet opened here steps back; one opened by a link replaces the URL", async ({ page }) => {
  await visit(page);
  await page.getByRole("button", { name: "Buka gabung" }).click();
  // A key pressed before the sheet is there reaches nothing.
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toHaveCount(0);
  await expect(url(page)).toHaveText("/dunia");
  // Stepping back leaves the sheet's own entry ahead: going forward reopens it.
  await page.evaluate(() => (window as unknown as { router: { navigate: (n: number) => void } }).router.navigate(1));
  await expect(sheet(page)).toBeVisible();

  await visit(page, "/dunia?gabung=K7M2-QX9P");
  await page.getByRole("button", { name: "Tutup" }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(url(page)).toHaveText("/dunia");
  await page.evaluate(() => (window as unknown as { router: { navigate: (n: number) => void } }).router.navigate(1));
  await expect(sheet(page)).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

  test("the carousel's join slot opens the sheet in place", async ({ page }) => {
    await visit(page);
    await page.getByRole("button", { name: "Kelas berikutnya" }).tap();
    await page.getByRole("button", { name: "Gabung course baru" }).tap();
    await expect(sheet(page)).toBeVisible();
    await expect(url(page)).toHaveText("/dunia?gabung=");
    // The on-screen keyboard stays down until the student taps the field.
    await expect(page.getByLabel("Kode kelas")).not.toBeFocused();
  });

  test("the sheet rises from the bottom edge and fits the screen", async ({ page }) => {
    await visit(page, "/dunia?gabung=K7M2-QX9P");
    await expect(sheet(page)).toBeVisible();
    const box = (await sheet(page).boundingBox())!;
    // Transitions are over once it sits flush with the bottom edge.
    await expect.poll(async () => Math.round((await sheet(page).boundingBox())!.y + (await sheet(page).boundingBox())!.height)).toBe(780);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect((await sheet(page).boundingBox())!.width).toBeLessThanOrEqual(390);
    await expect(page.getByRole("button", { name: "Gabung", exact: true })).toBeInViewport();
  });
});
