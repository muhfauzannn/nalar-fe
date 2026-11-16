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

test("the server's answer wins: its reason is shown, and a photo goes up as a small JPEG", async ({ page }) => {
  const sent: Array<Record<string, unknown>> = [];
  await page.route("**/api/manage/labs/match", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    sent.push(body);
    await route.fulfill({
      json: body.image
        ? { seen: "labu erlenmeyer", matches: [{ key: "reaktor-tumbukan", reason: "Labu kaca seperti tabung reaktor di lab ini." }] }
        : { seen: "pembiasan cahaya", matches: [] },
    });
  });
  await page.goto(PAGE);
  // a 1600px photo, so the browser has something to shrink
  await page.locator("input[type=file]").setInputFiles({
    name: "IMG_2041.png",
    mimeType: "image/png",
    buffer: await page.evaluate(async () => {
      const canvas = Object.assign(document.createElement("canvas"), { width: 1600, height: 1200 });
      canvas.getContext("2d")!.fillRect(0, 0, 10, 10);
      const blob = await new Promise<Blob>((done) => canvas.toBlob((b) => done(b!), "image/png"));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }).then((bytes) => Buffer.from(bytes)),
  });
  await expect(page.getByRole("heading", { name: "Reaktor tumbukan" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Labu kaca seperti tabung reaktor di lab ini.")).toBeVisible();
  const image = sent[0].image as { mimeType: string; data: string };
  expect(image.mimeType).toBe("image/jpeg");
  expect(image.data.length).toBeLessThan(200_000);
  expect(sent[0].keys).toHaveLength(4);

  await page.getByRole("button", { name: "Rakit lagi" }).click();
  await page.getByLabel("Alat atau konsep lab").fill("pembiasan cahaya");
  await page.getByRole("button", { name: "Rakit" }).click();
  await expect(page.getByText("Belum ada cetak biru untuk “pembiasan cahaya”")).toBeVisible({ timeout: 15_000 });
});
