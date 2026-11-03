import { expect, test, type Page } from "@playwright/test";

const ANALYTICS = "/manage/quizzes/q1/analytics";
const visit = (page: Page, search = "") => page.goto(`/tests/fixtures/manage-courses.html?at=${ANALYTICS}${search}`);
const students = (page: Page) => page.getByTestId("quiz-student");
const filters = (page: Page) => page.getByRole("group", { name: "Saring menurut pemakaian tutor" });

// The teacher reads this on a phone as often as at a desk: 44px is the smallest thing a thumb hits.
test.use({ viewport: { width: 390, height: 844 } });

async function heightOf(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  return Math.round(box?.height ?? 0);
}

test("the class summary, the spread of tutor use and every student are on one page", async ({ page }) => {
  await visit(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kuis Bab 1 — Gelombang");
  await expect(page.getByText("bukan nilai, dan tidak memengaruhi skor kuis")).toBeVisible();

  const summary = page.getByRole("region", { name: "Ringkasan pengerjaan" });
  await expect(summary).toContainText("Siswa7");
  await expect(summary).toContainText("Sudah mengumpulkan4");
  await expect(summary).toContainText("3 punya refleksi");

  // One bar per level; three reflections share the class, a third each.
  await expect(page.getByRole("button", { name: /Cenderung meminta jawaban.*33%/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Campuran.*0%/ })).toBeVisible();

  await expect(students(page)).toHaveCount(7);
  await expect(students(page).first()).toContainText("Ani");
  await expect(students(page).first()).toContainText("Pemakaian sehat");
  await expect(students(page).first()).toContainText("5 pertanyaan · 0 minta jawaban");
  await expect(students(page).filter({ hasText: "Budi" })).toContainText("8 pertanyaan · 7 minta jawaban");
  await expect(students(page).filter({ hasText: "Citra" })).toContainText("Tanpa AI Tutor");
  await expect(students(page).filter({ hasText: "Citra" })).toContainText("Tidak bertanya ke tutor");
  // Whoever has no reflection says why, instead of a level.
  await expect(students(page).filter({ hasText: "Dodi" })).toContainText("Sedang mengerjakan");
  await expect(students(page).filter({ hasText: "Eka" })).toContainText("Belum mengerjakan");
  await expect(students(page).filter({ hasText: "Fitri" })).toContainText("Refleksi belum tersedia");
});

test("a level narrows the list, says what to do about it, and can be picked from the bars or the chips", async ({ page }) => {
  await visit(page);
  const high = filters(page).getByRole("button", { name: /^Cenderung meminta jawaban/ });
  await expect(filters(page).getByRole("button", { name: /^Semua/ })).toHaveAttribute("aria-pressed", "true");

  await high.click();
  await expect(high).toHaveAttribute("aria-pressed", "true");
  await expect(students(page)).toHaveCount(1);
  await expect(students(page).first()).toContainText("Budi");
  await expect(page.getByTestId("follow-up")).toContainText("Bicara satu per satu");

  // The bars do the same as the chips.
  await page.getByRole("button", { name: /Pemakaian sehat.*33%/ }).click();
  await expect(students(page)).toHaveCount(1);
  await expect(students(page).first()).toContainText("Ani");
  await expect(filters(page).getByRole("button", { name: /^Pemakaian sehat/ })).toHaveAttribute("aria-pressed", "true");

  await filters(page).getByRole("button", { name: /^Belum ada refleksi/ }).click();
  await expect(students(page)).toHaveCount(4);
  await expect(page.getByTestId("follow-up")).toHaveCount(0);

  await filters(page).getByRole("button", { name: /^Campuran/ }).click();
  await expect(students(page)).toHaveCount(0);
  await expect(page.getByText("Tidak ada siswa di kelompok ini.")).toBeVisible();
});

test("opening a student shows how they asked the tutor and the report they read", async ({ page }) => {
  await visit(page);
  const ani = students(page).filter({ hasText: "Ani" });
  const budi = students(page).filter({ hasText: "Budi" });
  await expect(page.getByText("Kamu bertanya dengan hati-hati")).toBeHidden();

  await ani.getByRole("button", { name: /Ani/ }).click();
  await expect(ani.getByText("Kamu bertanya dengan hati-hati dan mengerjakan sisanya sendiri.")).toBeVisible();
  await expect(ani.getByText("Laporan yang dibaca siswa")).toBeVisible();
  await expect(ani.getByText("Coba soalnya dulu sebelum bertanya.")).toBeVisible();
  await expect(ani.getByText("Total tanya").locator("xpath=preceding-sibling::p")).toHaveText("5");
  // Another student stays closed, and Ani's tutor never redirected a request.
  await expect(budi.getByText("Kebanyakan pertanyaanmu")).toBeHidden();
  await expect(ani.getByText(/Tutor mengalihkan/)).toHaveCount(0);

  await budi.getByRole("button", { name: /Budi/ }).click();
  await expect(budi.getByText("Tutor mengalihkan 4 permintaan jawaban jadi ke petunjuk.")).toBeVisible();
  // Both stay open: the teacher can read two side by side.
  await expect(ani.getByText("Kamu bertanya dengan hati-hati dan mengerjakan sisanya sendiri.")).toBeVisible();
});

test("a student who never asked has a report but no counts to show", async ({ page }) => {
  await visit(page);
  const citra = students(page).filter({ hasText: "Citra" });
  await citra.getByRole("button", { name: /Citra/ }).click();
  await expect(citra.getByText("Kamu mengerjakan kuis tanpa bertanya ke tutor.")).toBeVisible();
  await expect(citra.getByText("Total tanya")).toHaveCount(0);
});

test("before anyone has a reflection the page says when they appear", async ({ page }) => {
  await visit(page, "&belum");
  await expect(page.getByText("Refleksi dibuat setelah siswa mengumpulkan kuis.")).toBeVisible();
  await expect(students(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Ringkasan pengerjaan" })).toContainText("0 punya refleksi");
});

test("it fits a phone: nothing scrolls sideways, and every tap target is thumb-sized", async ({ page }) => {
  await visit(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);

  for (const chip of await filters(page).getByRole("button").all()) {
    expect(await heightOf(chip), String(await chip.textContent())).toBeGreaterThanOrEqual(44);
  }
  for (const bar of await page.getByRole("button", { name: /%$/ }).all()) {
    expect(await heightOf(bar), String(await bar.textContent())).toBeGreaterThanOrEqual(44);
  }
  for (const trigger of await students(page).getByRole("button").all()) {
    expect(await heightOf(trigger), String(await trigger.textContent())).toBeGreaterThanOrEqual(44);
  }

  // A long name wraps inside its row instead of pushing the page wider.
  const long = students(page).filter({ hasText: "Kusumawardhana" });
  await expect(long).toBeVisible();
  expect((await long.boundingBox())!.width).toBeLessThanOrEqual(390);
});

test("the quiz editor links to it once the quiz is out, and not while it is a draft", async ({ page }) => {
  await page.goto("/tests/fixtures/manage-courses.html?at=/manage/quizzes/q1");
  await expect(page.getByRole("link", { name: "Refleksi tutor" })).toHaveCount(0);

  await page.goto("/tests/fixtures/manage-courses.html?at=/manage/quizzes/q1&locked");
  const link = page.getByRole("link", { name: "Refleksi tutor" });
  await expect(link).toHaveAttribute("href", ANALYTICS);
  expect(await heightOf(link)).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page.getByTestId("url")).toHaveText(ANALYTICS);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kuis Bab 1 — Gelombang");
  // The way back is in the breadcrumbs.
  await expect(page.getByRole("link", { name: "Kuis Bab 1 — Gelombang" })).toHaveAttribute("href", "/manage/quizzes/q1");
});
