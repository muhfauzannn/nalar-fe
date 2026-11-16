import { expect, test } from "@playwright/test";

// The lesson editor: one job per tab, the title edited in place, saving in a bar that shows up on a change.
const PAGE = "/tests/fixtures/lesson-editor.html";

test("saving from another tab still sends the material, and the bar says it is saved", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByLabel("Judul lesson").fill("Meriam desa");
  await page.getByRole("tab", { name: "Lab" }).click();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/Tersimpan/);
  const sent = await page.evaluate(() => (window as unknown as { lastAction: Record<string, string> }).lastAction);
  expect(sent).toMatchObject({ intent: "lesson-update", title: "Meriam desa", status: "draft" });
  expect(sent.content).toContain("lintasan parabola");
});

test("discarding puts the lesson back, and #lab opens the lab tab", async ({ page }) => {
  await page.goto(PAGE);
  await page.getByLabel("Konten lesson").fill("Coret-coret");
  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(page.getByLabel("Konten lesson")).toHaveValue(/lintasan parabola/);
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.goto(`${PAGE}#lab`);
  await expect(page.getByRole("tab", { name: "Lab" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Alat atau konsep lab")).toBeVisible();
});
