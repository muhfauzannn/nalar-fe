import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

for (const allowed of [true, false]) {
  test(`quiz tutor can be summoned only when allowed: ${allowed}`, async ({ page }) => {
    await page.goto(`/tests/fixtures/classroom.html?station=kuis&quizAi=${allowed ? "on" : "off"}`);
    const summon = page.getByRole("button", { name: "Panggil tutor", exact: true });
    await expect(page.getByRole("button", { name: "Mulai quiz" })).toBeVisible({ timeout: 30_000 });
    if (allowed) await expect(summon).toBeVisible();
    else {
      await expect(page.getByText("AI Assistant dinonaktifkan oleh guru untuk kuis ini")).toBeVisible();
      await expect(summon).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Mulai quiz" }).click();
    await expect(page.getByRole("button", { name: "Mulai quiz" })).toHaveCount(0);
    if (allowed) {
      await summon.click();
      await expect(page.getByRole("region", { name: "Tutor AI" })).toBeVisible();
    } else {
      await expect(summon).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Tutor AI" })).toHaveCount(0);
      await expect(page.getByLabel("Tutor untuk soal aktif")).toHaveCount(0);
    }
  });
}
