import { expect, test, type Page } from "@playwright/test";

// The tests about the 3D scene draw it in software, and several run at once.
test.setTimeout(90_000);

const visit = (page: Page, search = "") => page.goto(`/tests/fixtures/world-overlay.html${search}`);
const pill = (page: Page) => page.getByRole("button", { name: /^Tenggat · / });
const rows = (page: Page) => page.getByTestId("deadline");
const url = (page: Page) => page.getByTestId("url");
const dock = (page: Page) => page.getByRole("link", { name: "Terbang" }).locator("xpath=..");

async function heightOf(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  return Math.round(box?.height ?? 0);
}

test("the HUD counts the deadlines and says how many are urgent", async ({ page }) => {
  await visit(page);
  await expect(pill(page)).toContainText("Tenggat · 3");
  await expect(pill(page)).toContainText("1 besok");
});

test("the dock leads with the urgent deadline, and Terbang goes to its quiz board", async ({ page }) => {
  await visit(page);
  await expect(dock(page)).toContainText("Tenggat besok · 16.00");
  await expect(dock(page)).toContainText("Kuis Bab 1 — Gelombang");
  await expect(page.getByRole("link", { name: "Terbang" })).toHaveAttribute("href", "/courses/c1/kelas?fokus=kuis&kuis=q1");
  await expect(page.getByText("Lanjutkan perjalanan")).toHaveCount(0);
});

test("on a wide screen Tenggat opens as a card, the urgent group first, and a row flies to its place", async ({ page }) => {
  await visit(page);
  await expect(rows(page)).toHaveCount(0);
  await pill(page).click();
  await expect(pill(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Segera · dalam 48 jam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Berikutnya" })).toBeVisible();

  const urgent = rows(page).first();
  await expect(urgent).toHaveAttribute("data-tone", "soon");
  await expect(urgent).toContainText("Kuis Bab 1 — Gelombang");
  await expect(urgent).toContainText("Kelas Fisika · Kuis");
  await expect(urgent).toContainText("Besok, 16.00");
  await expect(rows(page).nth(1)).toHaveAttribute("data-tone", "later");
  await expect(rows(page).nth(1)).toContainText("hari lagi");
  await expect(rows(page).nth(1)).toHaveAttribute("href", "/courses/c1/balai/a1");

  await rows(page).nth(2).click();
  await expect(url(page)).toHaveText("/courses/c2/kelas?fokus=kuis&kuis=q2");
  await expect(rows(page)).toHaveCount(0);
});

test("nothing due says so, and the dock is the usual one", async ({ page }) => {
  await visit(page, "?kosong");
  await expect(page.getByText("Tidak ada tenggat")).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
  await expect(page.getByText("Lanjutkan perjalanan")).toBeVisible();
  await expect(page.getByRole("link", { name: "Terbang" })).toHaveAttribute("href", "/courses/c1/kelas");
});

test("an older API that sends no deadlines leaves the HUD as it was", async ({ page }) => {
  await visit(page, "?lama");
  await expect(page.getByRole("button", { name: /^Misi minggu ini/ })).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
  await expect(page.getByText("Tidak ada tenggat")).toHaveCount(0);
  await expect(page.getByText("Lanjutkan perjalanan")).toBeVisible();
});

test("the island's sign carries the tag of its urgent work", async ({ page }) => {
  await visit(page, "?scene");
  await expect(page.getByRole("button", { name: /Kelas Fisika.*Kuis besok · 16\.00/ }).first()).toBeAttached({ timeout: 30_000 });
  // Only the island with urgent work has one.
  await expect(page.getByRole("button", { name: /Kelas Matematika.*Kuis/ })).toHaveCount(0);
});

test("each island's sign sits over its own island, not all over the centre one", async ({ page }) => {
  await visit(page, "?scene");
  const signs = page.getByRole("button", { name: /^Kelas (Fisika|Matematika|Kimia)/ });
  await expect(signs).toHaveCount(3, { timeout: 30_000 });
  await expect.poll(async () => {
    const spots = await signs.evaluateAll((items) => items.map((item) => item.getBoundingClientRect()).map((box) => [box.x + box.width / 2, box.y + box.height / 2]));
    const gaps = spots.flatMap((spot, index) => spots.slice(index + 1).map((other) => Math.hypot(spot[0]! - other[0]!, spot[1]! - other[1]!)));
    return Math.min(...gaps) > 80;
  }).toBe(true);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Tenggat comes up from the bottom as a sheet, and each row is thumb-sized", async ({ page }) => {
    await visit(page);
    await pill(page).tap();
    const sheet = page.getByRole("dialog", { name: "Tenggat" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("3 yang perlu kamu selesaikan");
    await expect(rows(page)).toHaveCount(3);
    for (const row of await rows(page).all()) expect(await heightOf(row)).toBeGreaterThanOrEqual(72);
    // Transitions are over once it sits flush with the bottom edge.
    await expect.poll(async () => Math.round((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height), { timeout: 20_000 }).toBe(844);
  });

  test("picking a row puts the sheet away and flies to its place", async ({ page }) => {
    await visit(page);
    await pill(page).tap();
    await rows(page).first().tap();
    await expect(url(page)).toHaveText("/courses/c1/kelas?fokus=kuis&kuis=q1");
    await expect(page.getByRole("dialog", { name: "Tenggat" })).toHaveCount(0);
  });

  test("the close button puts the sheet away", async ({ page }) => {
    await visit(page);
    await pill(page).tap();
    await page.getByRole("button", { name: "Tutup" }).tap();
    await expect(page.getByRole("dialog", { name: "Tenggat" })).toHaveCount(0);
    await expect(url(page)).toHaveText("/dunia");
  });
});
