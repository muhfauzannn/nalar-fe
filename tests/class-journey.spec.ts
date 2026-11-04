import { expect, test, type Page } from "@playwright/test";

// The teacher's view of how the class went through a task: what students did, with the evidence
// one tap away (fixtures/manage-courses.html).

const visit = (page: Page, search = "") => page.goto(`/tests/fixtures/manage-courses.html?at=/manage/assignments/a1/analytics${search}`);
const routes = (page: Page) => page.getByRole("list", { name: "Rute siswa" }).getByRole("button");
const WORST = "Draf tipis → Minta jawaban → Ditempel";

test("every route through the class is listed, the most travelled first", async ({ page }) => {
  await visit(page);
  await expect(routes(page)).toHaveCount(3);
  await expect(routes(page).first()).toContainText(`${WORST}5`);
  await expect(routes(page).nth(1)).toContainText("Draf tipis → Minta petunjuk → Revisi berisi4");
  await expect(routes(page).nth(2)).toContainText("Draf kuat → Menguji → Revisi berisi3");
});

test("the page opens on who to talk to, with the evidence for each", async ({ page }) => {
  await visit(page);
  const panel = page.getByText("Perlu didekati · 5 siswa");
  await expect(panel).toBeVisible();
  await expect(page.getByRole("link", { name: /Siswa 12/ })).toContainText("Draf 6 kata · 3 dari 4 pertanyaan minta jawaban · 95% jawaban akhir ditempel");
  await expect(page.getByRole("link", { name: /Siswa 1\b/ })).toHaveCount(0);
});

test("picking a route, a ribbon or a student shows who is there, and the teacher can go back", async ({ page }) => {
  await visit(page);
  await routes(page).nth(2).click();
  await expect(page.getByText("Draf kuat → Menguji → Revisi berisi · 3 siswa")).toBeVisible();
  await page.locator('[data-link="thin>hints"]').click({ force: true });
  await expect(page.getByText("Draf tipis → Minta petunjuk · 4 siswa")).toBeVisible();
  await page.getByRole("button", { name: /^Siswa 1:/ }).click();
  await expect(page.getByText("Siswa 1 · 1 siswa")).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke yang perlu didekati" }).click();
  await expect(page.getByText("Perlu didekati · 5 siswa")).toBeVisible();
});

test("a student's line opens their process", async ({ page }) => {
  await visit(page);
  await page.getByRole("link", { name: /Siswa 12/ }).click();
  await expect(page.getByText("Proses siswa")).toBeVisible();
});

test("the map places students by what they did, and the ones to talk to are told apart by shape", async ({ page }) => {
  await visit(page);
  const dots = page.getByRole("button", { name: /^Siswa \d+:/ });
  await expect(dots).toHaveCount(12);
  await expect(page.locator(".rotate-45")).toHaveCount(5);
  const strong = await page.getByRole("button", { name: /^Siswa 2:/ }).boundingBox();
  const worst = await page.getByRole("button", { name: /^Siswa 12:/ }).boundingBox();
  expect(strong!.x).toBeGreaterThan(worst!.x);
  expect(strong!.y).toBeLessThan(worst!.y);
});

test("students who have not submitted are not on the charts, and an empty class shows nothing", async ({ page }) => {
  await visit(page);
  await expect(page.getByRole("button", { name: /^Siswa 13:/ })).toHaveCount(0);
  await visit(page, "&kosong=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Susu basi");
  await expect(page.getByText("Alur kelas")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("the routes replace the drawing, and nothing reaches past the screen", async ({ page }) => {
    await visit(page);
    await expect(page.locator('[data-link="thin>hints"]')).toBeHidden();
    await expect(routes(page).first()).toBeVisible();
    expect((await routes(page).first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const widest = await page.getByRole("region", { name: "Perjalanan kelas" }).locator("*").evaluateAll((all) => Math.max(...all.map((el) => el.getBoundingClientRect().right)));
    expect(widest).toBeLessThanOrEqual(360);
  });
});
