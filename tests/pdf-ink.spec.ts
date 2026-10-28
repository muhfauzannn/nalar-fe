import { expect, test } from "@playwright/test";
import {
  handwritingPaths,
  buildInkPlan,
} from "../app/features/lms/lib/handwriting/ink-plan";

const equation = {
  resourceId: "pdf",
  page: 1,
  revision: 1,
  turnId: "turn",
  caption: "Luas",
  actions: [
    {
      kind: "text" as const,
      x: 0.1,
      y: 0.2,
      width: 0,
      height: 0,
      text: "L = p × l",
    },
  ],
};
test("handwriting uses real pen-down paths for letters, digits and math symbols", () => {
  const hand = handwritingPaths("L = p × l 12² ÷ π √ ≠", 800);
  expect(hand.paths.length).toBeGreaterThan(15);
  expect(hand.fallback).toHaveLength(0);
  expect(
    hand.paths.every((d) => d.startsWith("M") && !d.slice(1).includes("M")),
  ).toBe(true);
  expect(
    handwritingPaths("Catatan ∑", 800).fallback.map((f) => f.text),
  ).toEqual(["∑"]);
});
test("writing wraps within the source page and retains the complete accessible note", () => {
  const plan = buildInkPlan(equation, 1294);
  expect(plan.notes[0].text).toBe("L = p × l");
  expect(plan.strokes.every((s) => s.writing)).toBe(true);
  expect(
    handwritingPaths("Pembilang menunjukkan bagian yang dipilih", 170).height,
  ).toBeGreaterThan(80);
});

test("GSAP reveals a rectangle progressively while the hand stays at the stroke tip", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/tests/fixtures/ink-playback.html");
  await page
    .getByRole("button", { name: "Draw rectangle", exact: true })
    .click();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  const stroke = page.getByTestId("tutor-rectangle");
  const before = Number(await stroke.getAttribute("data-progress"));
  expect(before).toBeGreaterThan(0);
  expect(before).toBeLessThan(1);
  await page.clock.runFor(350);
  const after = Number(await stroke.getAttribute("data-progress"));
  expect(after).toBeGreaterThan(before);
  expect(after).toBeLessThan(1);
  const positions = await page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(
      '[data-testid="tutor-rectangle"]',
    )!;
    const hand = document.querySelector<SVGGElement>(
      '[data-testid="tutor-drawing-hand"]',
    )!;
    const point = path.getPointAtLength(
      path.getTotalLength() * Number(path.dataset.progress),
    );
    return {
      x: point.x,
      y: point.y,
      handX: Number(hand.dataset.x),
      handY: Number(hand.dataset.y),
    };
  });
  expect(positions.handX).toBeCloseTo(positions.x, 4);
  expect(positions.handY).toBeCloseTo(positions.y, 4);
  await expect(page.getByTestId("tutor-drawing-hand")).toBeVisible();
  await page.screenshot({ path: "test-results/tutor-hand-drawing.png" });
  await page.clock.runFor(10_000);
  await expect(page.getByTestId("pdf-annotation-layer")).toHaveAttribute(
    "data-ink-state",
    "complete",
  );
  await expect(stroke).toHaveAttribute("data-progress", "1");
  await expect(page.getByTestId("tutor-drawing-hand")).toBeHidden();
});

test("letters are written one stroke at a time rather than appearing as a complete text label", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/tests/fixtures/ink-playback.html");
  await page
    .getByRole("button", { name: "Write equation", exact: true })
    .click();
  await page.clock.pauseAt(new Date(Date.now() + 80));
  const paths = page.locator('[data-stroke-kind="text"]');
  expect(await paths.count()).toBeGreaterThan(10);
  expect(await page.locator('[data-testid="tutor-note"] text').count()).toBe(0);
  const before = await paths.evaluateAll((nodes) =>
    nodes.map((node) => Number((node as SVGPathElement).dataset.progress)),
  );
  expect(before.some((v) => v > 0)).toBe(true);
  expect(before.filter((v) => v === 0).length).toBeGreaterThan(5);
  await page.clock.runFor(500);
  const after = await paths.evaluateAll((nodes) =>
    nodes.map((node) => Number((node as SVGPathElement).dataset.progress)),
  );
  expect(after.reduce((a, b) => a + b, 0)).toBeGreaterThan(
    before.reduce((a, b) => a + b, 0),
  );
  await page.screenshot({ path: "test-results/tutor-hand-writing.png" });
  await page.clock.runFor(10_000);
  await expect(page.getByTestId("pdf-annotation-layer")).toHaveAttribute(
    "data-ink-state",
    "complete",
  );
  await expect(page.getByTestId("tutor-note")).toContainText("Luas = p × l");
  await page.screenshot({
    path: "test-results/tutor-handwriting-complete.png",
  });
});

test("context changes freeze ink without replaying it on zoom or rotation, and clear cancels all motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/tests/fixtures/ink-playback.html");
  await page
    .getByRole("button", { name: "Write equation", exact: true })
    .click();
  await page.clock.pauseAt(new Date(Date.now() + 120));
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const paths = page.locator("[data-ink-stroke]");
  const frozen = await paths.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-progress")),
  );
  await page.clock.runFor(1200);
  expect(
    await paths.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-progress")),
    ),
  ).toEqual(frozen);
  await expect(page.getByTestId("pdf-annotation-layer")).toHaveAttribute(
    "data-ink-state",
    "paused",
  );
  await expect(page.getByTestId("tutor-drawing-hand")).toBeHidden();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page.clock.runFor(1200);
  expect(
    await paths.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-progress")),
    ),
  ).toEqual(frozen);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.clock.runFor(1500);
  await expect(paths).toHaveCount(0);
});

test("reduced motion renders complete legible ink immediately without a moving hand", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixtures/ink-playback.html");
  await page.getByRole("button", { name: "Draw lesson", exact: true }).click();
  await expect(page.getByTestId("pdf-annotation-layer")).toHaveAttribute(
    "data-ink-state",
    "complete",
  );
  expect(
    await page
      .locator("[data-ink-stroke]")
      .evaluateAll((nodes) =>
        nodes.every((n) => n.getAttribute("data-progress") === "1"),
      ),
  ).toBe(true);
  await expect(page.getByTestId("tutor-drawing-hand")).toBeHidden();
  await expect(page.getByTestId("tutor-note")).toContainText("Luas = p × l");
});


test("cursor-only steps move smoothly and change the bubble while preserving completed ink", async ({ page }) => {
  await page.clock.install();
  await page.goto("/tests/fixtures/ink-playback.html");
  await page.getByRole("button", { name: "Draw rectangle", exact: true }).click();
  await page.clock.runFor(3_000);
  const before = await page.locator("[data-ink-stroke]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-progress")));
  await page.getByRole("button", { name: "Move cursor 1", exact: true }).click();
  await page.clock.runFor(250);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Perhatikan pembilang");
  await page.getByRole("button", { name: "Move cursor 2", exact: true }).click();
  await page.clock.runFor(250);
  await expect(page.getByTestId("tutor-cursor")).toHaveAttribute("data-x", "0.7");
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Perhatikan penyebut");
  expect(await page.locator("[data-ink-stroke]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-progress")))).toEqual(before);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
});

test("the cursor bubble changes at each annotation action", async ({ page }) => {
  await page.clock.install();
  await page.goto("/tests/fixtures/ink-playback.html");
  await page.getByRole("button", { name: "Guide two parts", exact: true }).click();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Bagian pertama");
  await page.clock.runFor(2_000);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Lalu bagian kedua");
});

test("reduced motion updates cursor cues immediately without a travel animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixtures/ink-playback.html");
  await page.getByRole("button", { name: "Move cursor 1", exact: true }).click();
  await page.getByRole("button", { name: "Move cursor 2", exact: true }).click();
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Perhatikan penyebut");
  expect(await page.getByTestId("tutor-cursor").evaluate((element) => element.getAnimations().length)).toBe(0);
});
