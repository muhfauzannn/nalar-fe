import { expect, test, type Page } from "@playwright/test";

const visit = (page: Page, search = "") => page.goto(`/tests/fixtures/manage-courses.html${search}`);
const cards = (page: Page) => page.getByTestId("managed-course");
const url = (page: Page) => page.getByTestId("url");
const sheet = (page: Page) => page.getByRole("dialog", { name: "Buat course" });

// The phone is the screen this page is built for: 44px is the smallest thing a thumb hits.
test.use({ viewport: { width: 390, height: 844 } });

async function heightOf(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  return Math.round(box?.height ?? 0);
}

test("the list shows each course with its status, numbers and class code", async ({ page }) => {
  await visit(page);
  await expect(page.getByText("4 course · 105 siswa terdaftar")).toBeVisible();
  await expect(cards(page)).toHaveCount(4);

  const physics = cards(page).filter({ hasText: "Fisika Kelas XI" });
  await expect(physics.getByText("Terbit")).toBeVisible();
  await expect(physics.getByTestId("managed-course-code")).toHaveText("K7M2-QX9P");
  await expect(physics.getByRole("link", { name: "Kelola" })).toHaveAttribute("href", "/manage/courses/c1");

  // A draft says why its code does nothing yet; an archive has no code and opens read-only.
  const draft = cards(page).filter({ hasText: "Kimia Dasar" });
  await expect(draft.getByText("Draf")).toBeVisible();
  await expect(draft.getByText(/Belum terbit/)).toBeVisible();
  await expect(draft.getByRole("link", { name: "Lanjutkan" })).toBeVisible();
  const archive = cards(page).filter({ hasText: "Biologi Kelas X" });
  await expect(archive.getByText("Dimatikan")).toBeVisible();
  await expect(archive.getByRole("link", { name: "Lihat arsip" })).toBeVisible();
});

test("the status chips filter the list and say which one is chosen", async ({ page }) => {
  await visit(page);
  const group = page.getByRole("group", { name: "Saring menurut status" });
  await expect(group.getByRole("button", { name: /^Semua/ })).toHaveAttribute("aria-pressed", "true");

  await group.getByRole("button", { name: /^Draf/ }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Kimia Dasar");
  await expect(group.getByRole("button", { name: /^Draf/ })).toHaveAttribute("aria-pressed", "true");
  await expect(group.getByRole("button", { name: /^Semua/ })).toHaveAttribute("aria-pressed", "false");

  await group.getByRole("button", { name: /^Semua/ }).click();
  await expect(cards(page)).toHaveCount(4);
});

test("what a thumb has to hit is at least 44px", async ({ page }) => {
  await visit(page);
  await expect(cards(page).first()).toBeVisible();
  const targets = [
    page.getByRole("link", { name: "Buat course" }),
    page.getByRole("button", { name: /^Semua/ }),
    page.getByRole("button", { name: /^Diarsipkan/ }),
    page.getByRole("button", { name: "Salin kode K7M2-QX9P" }),
    cards(page).first().getByRole("link", { name: "Kelola" }),
    page.getByRole("link", { name: "Gabung ke course" }),
  ];
  for (const target of targets) expect(await heightOf(target), String(await target.textContent())).toBeGreaterThanOrEqual(44);
});

test("the cards fit a phone without sideways scrolling", async ({ page }) => {
  await visit(page);
  await expect(cards(page)).toHaveCount(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("with no course yet the page shows the three steps and one way to start", async ({ page }) => {
  await visit(page, "?kosong");
  await expect(page.getByRole("heading", { name: "Kamu belum membuat course" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Isi materi dan kuis" })).toBeVisible();
  // One "Buat course", not one in the header and one in the empty card.
  await expect(page.getByRole("link", { name: "Buat course" })).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Saring menurut status" })).toHaveCount(0);
});

test("Buat course opens a sheet over the list, and closing it leaves the list as it was", async ({ page }) => {
  await visit(page);
  await expect(sheet(page)).toHaveCount(0);
  await page.getByRole("link", { name: "Buat course" }).click();
  await expect(sheet(page)).toBeVisible();
  await expect(url(page)).toHaveText("/manage?buat");

  await sheet(page).getByRole("button", { name: "Tutup" }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(url(page)).toHaveText("/manage");
  await expect(cards(page)).toHaveCount(4);
});

test("the old /manage/courses/new address opens the same sheet", async ({ page }) => {
  await visit(page, "?at=/manage/courses/new");
  await expect(sheet(page)).toBeVisible();
  await expect(url(page)).toHaveText("/manage?buat");
});

test("a rejected name is explained in the sheet, which keeps what was typed", async ({ page }) => {
  await visit(page, "?at=/manage?buat");
  const dialog = sheet(page);
  await dialog.getByLabel("Nama course").fill("Gagal");
  await dialog.getByLabel("Mata pelajaran").selectOption({ label: "Fisika" });
  await dialog.getByRole("button", { name: "Buat course" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Nama course sudah dipakai.");
  await expect(dialog.getByLabel("Nama course")).toHaveValue("Gagal");
});

test("creating a course goes to its editor and the sheet goes away", async ({ page }) => {
  await visit(page, "?at=/manage?buat");
  const dialog = sheet(page);
  await dialog.getByLabel("Nama course").fill("Fisika Kelas XII");
  await dialog.getByLabel("Mata pelajaran").selectOption({ label: "Fisika" });
  await dialog.getByRole("button", { name: "Buat course" }).click();
  await expect(url(page)).toHaveText("/manage/courses/c1");
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fisika Kelas XI");
});

test("the editor's four tabs stay on one row and are thumb-sized", async ({ page }) => {
  await visit(page, "?at=/manage/courses/c1");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  const boxes = await tabs.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
  for (const box of boxes) {
    expect(Math.round(box.top)).toBe(Math.round(boxes[0]!.top));
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
  }
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
});

test("the class code is one tap to copy, and its buttons are thumb-sized", async ({ page }) => {
  await page.addInitScript(() => {
    // The test host is plain http, which has no clipboard.
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => ((window as unknown as { copied: string }).copied = text) } });
  });
  await visit(page, "?at=/manage/courses/c1");
  await expect(page.getByTestId("join-code")).toHaveText("K7M2-QX9P");
  const copy = page.getByRole("button", { name: "Salin kode" });
  expect(await heightOf(copy)).toBeGreaterThanOrEqual(44);
  expect(await heightOf(page.getByRole("button", { name: "Matikan kode" }))).toBeGreaterThanOrEqual(44);
  await copy.click();
  await expect(page.getByRole("status").filter({ hasText: "Tersalin" })).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe("K7M2-QX9P");
});
