import { expect, test } from "@playwright/test";

// Bengkel lab: a request "crafts" a lab, which is really the closest lab in the catalog (craft/match.ts).
const PAGE = "/tests/fixtures/lab-workshop.html";

test("a description is forged into the matching lab, which can be attached", async ({ page }) => {
  await page.goto(PAGE);
  await page.getByLabel("Alat atau konsep lab").fill("mikroskop untuk sel darah");
  await page.getByRole("button", { name: "Rakit" }).click();
  await expect(page.getByRole("progressbar", { name: "Lab sedang dirakit" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mikroskop osmosis" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Cocok dengan mikroskop/)).toBeVisible();
  await page.getByRole("button", { name: "Pasang lab ini" }).click();
  await expect(page.getByTestId("attached")).toHaveText("mikroskop-osmosis");
  // the table clears for the next lab
  await expect(page.getByLabel("Alat atau konsep lab")).toBeVisible();
});

test("a photo is matched too, and an unknown tool says so instead of forging something wrong", async ({ page }) => {
  await page.goto(PAGE);
  await page.locator("input[type=file]").setInputFiles({ name: "meriam-sekolah.png", mimeType: "image/png", buffer: Buffer.from("x") });
  await expect(page.getByRole("heading", { name: "Gerak parabola" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Rakit lagi" }).click();
  await page.getByLabel("Alat atau konsep lab").fill("kincir angin");
  await page.getByRole("button", { name: "Rakit" }).click();
  await expect(page.getByText("Belum ada cetak biru untuk “kincir angin”")).toBeVisible({ timeout: 15_000 });
});
