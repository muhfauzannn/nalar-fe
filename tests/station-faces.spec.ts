import { expect, test, type Page } from "@playwright/test";

// What the classroom's stations show instead of a blank screen (station-paint.ts, lab-picture.tsx): the lab bench's
// screen carries the real lab, the quiz board and the task book are painted from the course's data.

const SETTLE = { timeout: 40_000 };

async function openRoom(page: Page, size = { width: 1440, height: 800 }) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize(size);
  await page.goto("/tests/fixtures/classroom.html?pdf=1");
  await expect(page.getByRole("navigation", { name: "Stasiun kelas" })).toBeVisible(SETTLE);
  return errors;
}

type Face = "lab" | "quiz" | "book";
type Sample = Record<string, number>;

/** Paint a face in the page and say how many of its pixels are near each wanted colour (as a share of all pixels). */
async function painted(
  page: Page,
  face: Face,
  data: object,
  aspect: number,
  colours: Record<string, [number, number, number]>,
  /** Only count inside this part of the canvas, as shares of its width and height: [left, top, right, bottom]. */
  part: [number, number, number, number] = [0, 0, 1, 1],
) {
  return page.evaluate(
    async ({ face, data, aspect, colours, part }) => {
      const path = "/app/features/lms/world3d/station-paint.ts";
      const paint = await import(/* @vite-ignore */ path);
      await document.fonts.load('700 40px "Poppins"');
      const canvas = document.createElement("canvas");
      paint.sizeFace(canvas, aspect);
      const draw = { lab: paint.paintLab, quiz: paint.paintQuiz, book: paint.paintBook }[face];
      draw(canvas, data);
      const x0 = Math.floor(part[0] * canvas.width);
      const y0 = Math.floor(part[1] * canvas.height);
      const w = Math.floor((part[2] - part[0]) * canvas.width);
      const h = Math.floor((part[3] - part[1]) * canvas.height);
      const pixels = canvas.getContext("2d")!.getImageData(x0, y0, w, h).data;
      const share: Record<string, number> = {};
      for (const [name, [r, g, b]] of Object.entries(colours)) {
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (Math.abs(pixels[i]! - r) < 8 && Math.abs(pixels[i + 1]! - g) < 8 && Math.abs(pixels[i + 2]! - b) < 8) count++;
        share[name] = count / (pixels.length / 4);
      }
      return share;
    },
    { face, data, aspect, colours, part },
  );
}

const INK: [number, number, number] = [0x1b, 0x1a, 0x2e];
const VIOLET: [number, number, number] = [0x5e, 0x4a, 0xc4];
const LATE: [number, number, number] = [0xc8, 0x34, 0x4f];
const AMBER_TEXT: [number, number, number] = [0xb8, 0x6a, 0x00];
const DONE_CHIP: [number, number, number] = [0xdf, 0xf6, 0xec];
const NEW_CHIP: [number, number, number] = [0xef, 0xeb, 0xfb];
const MINT: [number, number, number] = [0x25, 0x6b, 0x59];
const GREEN_GEM: [number, number, number] = [0x34, 0xb4, 0x7e];

const quiz = { title: "Latihan Osmosis", minutes: 10, due: null, state: "new", score: null };
const posts = (status: string[]) => ["Upaya mandiri", "Tanya NALAR", "Evaluasi jawaban AI", "Revisi", "Refleksi"].map((name, index) => ({ name, status: status[index] }));
const book = { title: "Mengamati gaya gesek", due: null, state: "new", posts: posts(["locked", "locked", "locked", "locked", "locked"]), more: 0 };

test("the quiz board shows its title, its target and where the student stands", async ({ page }) => {
  const errors = await openRoom(page);
  const colours = { ink: INK, target: VIOLET, late: LATE, soon: AMBER_TEXT };
  const chips = { done: DONE_CHIP, fresh: NEW_CHIP };
  const corner: [number, number, number, number] = [0, 0.8, 0.45, 1];
  const fresh = await painted(page, "quiz", quiz, 1.4, colours);
  expect(fresh.ink, "the title is written").toBeGreaterThan(0.01);
  expect(fresh.target, "the target is drawn").toBeGreaterThan(0.05);
  expect(fresh.late).toBeLessThan(0.0005);
  expect((await painted(page, "quiz", quiz, 1.4, chips, corner)).fresh, "a quiz not yet started says so").toBeGreaterThan(0.1);

  const underWay = { ...quiz, due: { tone: "late", text: "Terlambat · Kemarin, 16.00" }, state: "running" };
  expect((await painted(page, "quiz", underWay, 1.4, colours)).late, "a late deadline is red").toBeGreaterThan(0.001);
  expect((await painted(page, "quiz", underWay, 1.4, chips, corner)).fresh, "a quiz under way is not 'not started'").toBeLessThan(0.005);
  const soon = await painted(page, "quiz", { ...quiz, due: { tone: "soon", text: "Besok, 16.00" } }, 1.4, colours);
  expect(soon.soon, "a deadline within two days is amber").toBeGreaterThan(0.001);
  const finished = { ...quiz, state: "done", score: "85.00" };
  expect((await painted(page, "quiz", finished, 1.4, chips, corner)).done, "a finished quiz shows its mark on green").toBeGreaterThan(0.03);
  expect((await painted(page, "quiz", finished, 1.4, chips, corner)).fresh).toBeLessThan(0.005);
  expect(errors).toEqual([]);
});

test("the task book shows the assignment and how far along its five posts are", async ({ page }) => {
  await openRoom(page);
  const colours = { ink: INK, gem: GREEN_GEM, current: VIOLET, done: DONE_CHIP };
  const none = await painted(page, "book", book, 1.33, colours);
  expect(none.ink, "the title is written").toBeGreaterThan(0.01);
  expect(none.gem, "no post is done yet").toBeLessThan(0.0005);
  const working = await painted(page, "book", { ...book, state: "working", posts: posts(["done", "current", "locked", "locked", "locked"]), more: 2 }, 1.33, colours);
  expect(working.gem, "a finished post is a green check").toBeGreaterThan(0.001);
  expect(working.current, "the current post is marked").toBeGreaterThan(0.001);
  const all = await painted(page, "book", { ...book, state: "done", posts: posts(["done", "done", "done", "done", "done"]) }, 1.33, colours);
  expect(all.gem).toBeGreaterThan(working.gem * 2);
  expect(all.done, "a finished assignment says so").toBeGreaterThan(0.002);
});

test("the lab bench's screen shows the lab's name and its picture, or a flask while there is none", async ({ page }) => {
  await openRoom(page);
  const colours = { tag: MINT, ink: INK };
  const empty = await painted(page, "lab", { title: "Mesin gelombang", subject: "Matematika", solved: 0, total: 3, picture: null }, 1.47, colours);
  expect(empty.tag, "the LAB tag and the flask").toBeGreaterThan(0.005);
  expect(empty.ink, "the lab's name is written").toBeGreaterThan(0.01);
  // with a picture (a red square stands in for the figure) the picture is on the card
  const withPicture = await page.evaluate(async () => {
    const path = "/app/features/lms/world3d/station-paint.ts";
      const paint = await import(/* @vite-ignore */ path);
    await document.fonts.load('700 40px "Poppins"');
    const picture = document.createElement("canvas");
    picture.width = 400;
    picture.height = 200;
    const pen = picture.getContext("2d")!;
    pen.fillStyle = "#ff0000";
    pen.fillRect(0, 0, 400, 200);
    const canvas = document.createElement("canvas");
    paint.sizeFace(canvas, 1.47);
    paint.paintLab(canvas, { title: "Mesin gelombang", subject: "Matematika", solved: 1, total: 3, picture });
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! > 240 && pixels[i + 1]! < 20 && pixels[i + 2]! < 20) red++;
    return red / (pixels.length / 4);
  });
  expect(withPicture, "the picture is on the screen, whole and not stretched").toBeGreaterThan(0.2);
});

test("the real lab is photographed for the bench and then taken away again", async ({ page }) => {
  const errors = await openRoom(page);
  const picture = await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const path = "/app/features/lms/world3d/station-pictures.ts";
          const { stationPictures } = await import(/* @vite-ignore */ path);
          const canvas = stationPictures.get("lab:gerak-parabola");
          if (!canvas) return null;
          const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
          let drawn = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i]! > 0) drawn++;
          return { width: canvas.width, height: canvas.height, drawn: drawn / (pixels.length / 4) };
        }),
      SETTLE,
    )
    .not.toBeNull()
    .then(() =>
      page.evaluate(async () => {
        const path = "/app/features/lms/world3d/station-pictures.ts";
          const { stationPictures } = await import(/* @vite-ignore */ path);
        const canvas = stationPictures.get("lab:gerak-parabola")!;
        const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        // how many distinct colours the figure has: a blank picture has one or two
        const seen = new Set<number>();
        for (let i = 0; i < pixels.length; i += 4) seen.add(((pixels[i]! >> 4) << 8) | ((pixels[i + 1]! >> 4) << 4) | (pixels[i + 2]! >> 4));
        return { width: canvas.width, height: canvas.height, colours: seen.size };
      }),
    );
  expect(picture.width).toBe(1400);
  expect(picture.height).toBeGreaterThan(300);
  expect(picture.colours, "a drawn figure, not a blank one").toBeGreaterThan(6);
  // the lab used for the photograph is not left in the page
  await expect(page.locator("[inert].fixed")).toHaveCount(0);
  expect(errors).toEqual([]);
});

// The 3D room itself: each station's surface is no longer one flat colour. The surface is found under its sign.
test("in the room, the lab bench's screen, the quiz board and the task book are no longer blank", async ({ page }) => {
  await openRoom(page);
  await page.waitForTimeout(3500);
  const spread = async (label: string, below: number, size: { width: number; height: number }) => {
    const sign = (await page.getByRole("button", { name: label, exact: true }).boundingBox())!;
    const clip = { x: Math.max(0, sign.x + sign.width / 2 - size.width / 2), y: sign.y + sign.height + below, ...size };
    const shot = await page.screenshot({ clip });
    return page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const pen = canvas.getContext("2d")!;
      pen.drawImage(image, 0, 0);
      const pixels = pen.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      let count = 0;
      const lights: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) {
        const light = 0.3 * pixels[i]! + 0.59 * pixels[i + 1]! + 0.11 * pixels[i + 2]!;
        lights.push(light);
        sum += light;
        count++;
      }
      const mean = sum / count;
      return Math.sqrt(lights.reduce((total, light) => total + (light - mean) ** 2, 0) / count);
    }, shot.toString("base64"));
  };
  // a blank, evenly lit surface barely varies; written, drawn ones vary a lot
  expect(await spread("Quiz", 14, { width: 200, height: 130 }), "quiz board").toBeGreaterThan(18);
  expect(await spread("Lab", 40, { width: 190, height: 90 }), "lab bench's screen").toBeGreaterThan(8);
  expect(await spread("Tugas", 70, { width: 150, height: 90 }), "task book").toBeGreaterThan(18);
});

test("no second copy of the lab is ever mounted while the student is at the bench", async ({ page }) => {
  // the tutor points at the lab's parts by name: two copies of the lab would give it two of every part
  await page.addInitScript(() => {
    (window as unknown as { copies: number }).copies = 0;
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node instanceof HTMLElement && (node.matches("[inert].fixed") || node.querySelector("[inert].fixed"))) (window as unknown as { copies: number }).copies++;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/tests/fixtures/classroom.html?station=lab&lab=mesin-gelombang");
  await expect(page.locator("[data-lab-part]").first()).toBeAttached(SETTLE);
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as unknown as { copies: number }).copies)).toBe(0);
  expect(await page.locator('[data-lab-part="engkol"]').count()).toBe(1);
  // and once the student steps back into the room, the lab is photographed for the bench
  await page.getByRole("link", { name: "Kembali melihat kelas" }).click();
  await expect
    .poll(() => page.evaluate(async () => {
      const path = "/app/features/lms/world3d/station-pictures.ts";
      const { stationPictures } = await import(/* @vite-ignore */ path);
      return Boolean(stationPictures.get("lab:mesin-gelombang"));
    }), SETTLE)
    .toBe(true);
});
