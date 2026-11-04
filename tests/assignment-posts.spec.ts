import { expect, test } from "@playwright/test";

// A task is one piece of work carried through five posts: each post shows what the earlier ones
// left behind (fixtures/assignment-posts.html), in the words of the world around it.

const DRAFT = "Balok lebih mudah turun kalau bidangnya curam.";
const EVALUATION = "Petunjuk NALAR benar, tetapi belum menyebut jenis permukaan.";
const FINAL = "Balok turun saat komponen berat melebihi gaya gesek maksimum.";
const open = (page: import("@playwright/test").Page, query: string) => page.goto(`/tests/fixtures/assignment-posts.html?${query}`);

test("Pos 1 shows nothing from before: the first draft stays the student's own", async ({ page }) => {
  await open(page, "pos=1");
  await expect(page.getByText("Pos 1 dari 5")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Percakapanmu dengan NALAR" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Tanda untuk balasan 1" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nyalakan pos" })).toBeVisible();
});

test("Pos 3 puts the tutor's words in front of the student who has to judge them", async ({ page }) => {
  await open(page, "pos=3");
  await expect(page.locator('[data-author="tutor"]')).toContainText("Coba uraikan gaya berat menjadi dua komponen.");
  await expect(page.locator('[data-author="student"]')).toContainText("Kenapa baloknya baru turun di sudut tertentu?");
  // The draft is one click away, not in the way.
  await expect(page.getByText(DRAFT)).toBeHidden();
  await page.getByRole("button", { name: "Draf awalmu" }).click();
  await expect(page.getByText(DRAFT)).toBeVisible();
});

test("Pos 3 says so when the student never asked the tutor", async ({ page }) => {
  await open(page, "pos=3&tanpa-tutor=1");
  await expect(page.getByText("Kamu tidak bertanya ke NALAR di Pos 2.")).toBeVisible();
});

test("Pos 4 opens on the student's own draft, with their evaluation beside it", async ({ page }) => {
  await open(page, "pos=4");
  await expect(page.getByRole("textbox")).toHaveValue(DRAFT);
  await expect(page.getByText(EVALUATION)).toBeVisible();
});

test("Pos 4 keeps what the student already changed over the first draft", async ({ page }) => {
  await open(page, "pos=4");
  await page.getByRole("textbox").fill("Sudah kuubah sebagian.");
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("Sudah kuubah sebagian.");
});

test("Pos 5 sets the first draft and the final answer side by side", async ({ page }) => {
  await open(page, "pos=5");
  await expect(page.getByRole("region", { name: "Draf awalmu" })).toContainText(DRAFT);
  await expect(page.getByRole("region", { name: "Jawaban finalmu" })).toContainText(FINAL);
  await expect(page.getByRole("button", { name: "Kumpulkan tugas" })).toBeVisible();
});

test("the task speaks the world's language", async ({ page }) => {
  for (const post of [1, 2, 3, 4, 5]) {
    await open(page, `pos=${post}`);
    await expect(page.getByText(`Pos ${post} dari 5`)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/assignment|submission|\btahap\b/i);
  }
});

test("a long draft does not push the page sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await open(page, "pos=5");
  await expect(page.getByRole("region", { name: "Draf awalmu" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the desk carries the island's path: lit posts have crystals, the cat stands on the current one", async ({ page }) => {
  await open(page, "pos=3");
  const track = page.getByRole("list", { name: "Lima pos" });
  await expect(track.locator("[data-crystal]")).toHaveCount(2);
  await expect(track.locator('[aria-current="step"]')).toContainText("Evaluasi jawaban AI");
  await expect(track.locator("[data-cat]")).toHaveCount(1);
});

test("the task stays at hand on every post", async ({ page }) => {
  for (const post of [1, 2, 3, 4, 5]) {
    await open(page, `pos=${post}`);
    await expect(page.getByText("Jelaskan pengaruh sudut bidang")).toHaveCount(1);
    await expect(page.getByText("Jelaskan pengaruh sudut bidang")).toBeVisible();
  }
});

test("a post completed at the desk lights up once, then the next one is ready for writing", async ({ page }) => {
  await open(page, "pos=1");
  const track = page.getByRole("list", { name: "Lima pos" });
  await expect(track).not.toHaveAttribute("data-lit");
  await page.getByRole("button", { name: "Pos berikutnya" }).click();
  await expect(track).toHaveAttribute("data-lit", "1_independent_effort");
  await expect(track).not.toHaveAttribute("data-lit", /.*/, { timeout: 5_000 });
  await expect(track.locator("[data-crystal]")).toHaveCount(1);
  await expect(page.getByText("Pos 2 dari 5")).toBeVisible();
});

test("reduced motion skips the lighting but still lands on the next post", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "pos=2");
  const track = page.getByRole("list", { name: "Lima pos" });
  await page.getByRole("button", { name: "Pos berikutnya" }).click();
  await expect(page.getByText("Pos 3 dari 5")).toBeVisible();
  await expect(track).not.toHaveAttribute("data-lit", /.*/);
  await expect(track.locator("[data-crystal]")).toHaveCount(2);
});

test("opening a task on a lit post plays nothing", async ({ page }) => {
  await open(page, "pos=4");
  await expect(page.getByRole("list", { name: "Lima pos" })).not.toHaveAttribute("data-lit");
});

for (const width of [320, 390]) {
  test(`the desk fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    for (const post of [1, 3, 5]) {
      await open(page, `pos=${post}`);
      await expect(page.getByRole("list", { name: "Lima pos" })).toBeVisible();
      // The page hides sideways overflow, so what counts is that nothing reaches past the screen.
      const widest = await page.locator("main *").evaluateAll((all) => Math.max(...all.filter((el) => !el.closest(".sr-only")).map((el) => el.getBoundingClientRect().right)));
      expect(widest).toBeLessThanOrEqual(width);
    }
  });
}

test("in the classroom's book the desk fits the surface, and Pos 2 points to the spirit beside it", async ({ page }, info) => {
  info.setTimeout(60_000);
  await page.goto("/tests/fixtures/classroom.html?station=tugas&pos=2");
  const book = page.locator('[data-classroom-surface="tugas"]');
  await expect(book.getByRole("list", { name: "Lima pos" })).toBeVisible({ timeout: 30_000 });
  await expect(book.getByText("NALAR ada di kelas bersamamu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Panggil tutor" })).toBeVisible();
  expect(await book.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

const mark = (page: import("@playwright/test").Page, name: string) => page.getByRole("group", { name: "Tanda untuk balasan 1" }).getByRole("button", { name });
const light = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Nyalakan pos" });

test("Pos 3 asks for a mark and a reason, and stores them as one text the teacher can read", async ({ page }) => {
  await open(page, "pos=3");
  await expect(light(page)).toBeDisabled();
  await mark(page, "Perlu dicek").click();
  await expect(light(page)).toBeDisabled();
  await page.getByRole("textbox", { name: "Alasan untuk balasan 1" }).fill("Aku belum tahu ini berlaku di bidang kasar.");
  await expect(light(page)).toBeEnabled();
  await expect(page.locator('input[name="content"]')).toHaveValue(
    "> NALAR: Coba uraikan gaya berat menjadi dua komponen.\nPenilaianku (perlu dicek): Aku belum tahu ini berlaku di bidang kasar.",
  );
});

test("a mark can be taken back, and marks survive a trip away from the page", async ({ page }) => {
  await open(page, "pos=3");
  await mark(page, "Kurang").click();
  await page.getByRole("textbox", { name: "Alasan untuk balasan 1" }).fill("Belum menyebut jenis permukaan.");
  await page.reload();
  await expect(mark(page, "Kurang")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("textbox", { name: "Alasan untuk balasan 1" })).toHaveValue("Belum menyebut jenis permukaan.");
  await mark(page, "Kurang").click();
  await expect(page.getByRole("textbox", { name: "Alasan untuk balasan 1" })).toHaveCount(0);
  await expect(light(page)).toBeDisabled();
});

test("a student who never asked the tutor writes their evaluation as before", async ({ page }) => {
  await open(page, "pos=3&tanpa-tutor=1");
  await expect(page.getByRole("group", { name: "Tanda untuk balasan 1" })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toBeVisible();
  await expect(light(page)).toBeEnabled();
});

test("in the classroom Pos 3 offers the course's lab, and it is not graded", async ({ page }, info) => {
  info.setTimeout(60_000);
  await page.goto("/tests/fixtures/classroom.html?station=tugas&pos=3&balasan=1");
  const link = page.getByRole("link", { name: /Uji di lab/ });
  await expect(link).toBeVisible({ timeout: 30_000 });
  await expect(link).toContainText("Hasil lab tidak dinilai.");
  await link.click();
  await expect(page.locator('[data-classroom-surface="lab"]')).toBeVisible({ timeout: 30_000 });
});

// The book in the real classroom: a page, not a web page in a frame.
const book = (page: import("@playwright/test").Page) => page.locator('[data-classroom-surface="tugas"]');
for (const [device, viewport] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 780 }]] as const) {
  for (const post of [1, 2, 3, 4, 5]) {
    test(`the classroom's book holds Pos ${post} without scrolling on ${device}`, async ({ page }, info) => {
      info.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.goto(`/tests/fixtures/classroom.html?station=tugas&pos=${post}&balasan=1`);
      await expect(book(page).getByRole("list", { name: "Lima pos" })).toBeVisible({ timeout: 30_000 });
      const submit = book(page).getByRole("button", { name: /Nyalakan pos|Kumpulkan tugas/ });
      await expect(submit).toBeInViewport({ ratio: 1 });
      expect(await book(page).evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      const scroller = book(page).locator(".overflow-y-auto").first();
      expect(await scroller.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      if (post === 1 || post === 4 || post === 5) expect((await book(page).getByRole("textbox").boundingBox())!.height).toBeGreaterThan(90);
    });
  }
}

test("the book keeps the sheets a post needs one tap away", async ({ page }) => {
  await open(page, "pos=4&buku=1");
  await page.getByRole("button", { name: "Evaluasi" }).click();
  await expect(page.getByRole("region", { name: "Bahan" })).toContainText(EVALUATION);
  await page.getByRole("button", { name: "Draf awal" }).click();
  await expect(page.getByRole("region", { name: "Bahan" })).toContainText(DRAFT);
  await expect(page.getByRole("textbox")).toHaveValue(DRAFT);
});

test("on a phone the sheets stay closed so the writing keeps the room", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await open(page, "pos=1&buku=1");
  await expect(page.getByText("Jelaskan pengaruh sudut bidang")).toBeHidden();
  await page.getByRole("button", { name: "Soal" }).click();
  await expect(page.getByText("Jelaskan pengaruh sudut bidang")).toBeVisible();
  await page.getByRole("button", { name: "Soal" }).click();
  await expect(page.getByText("Jelaskan pengaruh sudut bidang")).toBeHidden();
});

test("the book says what is recorded while writing, in one line", async ({ page }) => {
  await open(page, "pos=1&buku=1");
  await expect(page.getByText("Lama menulis, teks tempelan, dan pindah tab dicatat, bukan untuk nilai.")).toBeVisible();
});

test("a post completed in the book lights up on its small path", async ({ page }) => {
  await open(page, "pos=1&buku=1");
  const track = page.getByRole("list", { name: "Lima pos" });
  await page.getByRole("button", { name: "Pos berikutnya" }).click();
  await expect(track).toHaveAttribute("data-lit", "1_independent_effort");
  await expect(track).not.toHaveAttribute("data-lit", /.*/, { timeout: 5_000 });
  await expect(page.getByText("Pos 2 dari 5")).toBeVisible();
});
