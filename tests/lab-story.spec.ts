import { expect, test, type Page } from "@playwright/test";

import { CHALLENGES as LAJU } from "../app/features/labs/laju/model";
import { STORY as LAJU_STORY } from "../app/features/labs/laju/story";
import { CHALLENGES as OSMOSIS } from "../app/features/labs/osmosis/model";
import { STORY as OSMOSIS_STORY } from "../app/features/labs/osmosis/story";
import { CHALLENGES as PARABOLA } from "../app/features/labs/parabola/model";
import { STORY as PARABOLA_STORY } from "../app/features/labs/parabola/story";
import { CHALLENGES as SINUS } from "../app/features/labs/sinus/model";
import { STORY as SINUS_STORY } from "../app/features/labs/sinus/story";
import { openingRun, replayRun, resumeRun, solvedRun, type Beat, type LabStory } from "../app/features/labs/story";

// Every lab is told as a story (AGENTS.md, "Lab"). The first half holds the scripts to the
// rules; the second plays one in the classroom's bench (fixtures/classroom.html).

const PARTS: Record<string, string[]> = {
  "gerak-parabola": ["laras", "mesiu", "bola", "bendera", "kereta", "tembak"],
  "mesin-gelombang": ["engkol", "pasak", "roda-gigi", "grafik", "pena", "tombol"],
  "reaktor-tumbukan": ["pemanas", "pompa", "katalis", "pengukur", "reaksikan"],
  "mikroskop-osmosis": ["pipet", "lensa", "teteskan"],
};

/** What may only be said once the mission is solved. */
const ANSWERS: Record<string, string[]> = {
  "gerak-parabola": ["sama jauh", "massa tidak"],
  "mesin-gelombang": ["30°", "150°", "180°", "1,5"],
  "reaktor-tumbukan": [" 10 K", "305 K", "tidak habis", "tetap utuh"],
  "mikroskop-osmosis": ["0,9", "isotonis", "air masuk"],
};

const LABS = [
  { story: PARABOLA_STORY as LabStory, ids: PARABOLA.map((item) => item.id) as string[] },
  { story: SINUS_STORY as LabStory, ids: SINUS.map((item) => item.id) as string[] },
  { story: LAJU_STORY as LabStory, ids: LAJU.map((item) => item.id) as string[] },
  { story: OSMOSIS_STORY as LabStory, ids: OSMOSIS.map((item) => item.id) as string[] },
];

for (const { story, ids } of LABS) {
  const all = (): Beat[] => [...story.opening, ...ids.flatMap((id) => [...story.missions[id]!.before, ...story.missions[id]!.after])];

  test(`${story.key}: the script fits the lab`, () => {
    expect(Object.keys(story.missions).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(story.missions[id]!.before.length, `${id} opens with a scene`).toBeGreaterThan(0);
      expect(story.missions[id]!.after.length, `${id} explains why`).toBeGreaterThan(0);
    }
    expect(story.closing.findings).toHaveLength(ids.length);
    expect(story.opening[0]!.part, "the story starts before the tour").toBeUndefined();
    expect(story.opening.filter((beat) => beat.part).length, "the opening tours the machine").toBeGreaterThanOrEqual(2);
    expect(story.opening.some((beat) => beat.act), "the tour has the student try the machine").toBe(true);
    for (const beat of all()) {
      expect(beat.text.length, beat.text).toBeLessThanOrEqual(140);
      if (beat.part) {
        expect(PARTS[story.key]).toContain(beat.part);
        expect(beat.caption, `${beat.part} has a caption`).toBeTruthy();
      }
      if (beat.act) expect(beat.part, "trying needs a part").toBeTruthy();
    }
  });

  test(`${story.key}: nothing before a mission gives its answer away`, () => {
    const early = [...story.opening, ...ids.flatMap((id) => story.missions[id]!.before)].map((beat) => beat.text);
    for (const text of early) for (const answer of ANSWERS[story.key]!) expect(text, `"${answer}" is said too early`).not.toContain(answer);
  });

  test(`${story.key}: the runs lead on to the next open mission`, () => {
    const first = openingRun(story, ids, []);
    expect(first.then).toBe(0);
    expect(first.steps.filter((step) => step.mission !== undefined).map((step) => step.mission)).toEqual([0]);
    expect(resumeRun(story, ids, [ids[0]!]).then).toBe(1);

    const solved = solvedRun(story, ids, [ids[0]!], ids[0]!);
    expect(solved.steps[0]!.text).toBe(story.missions[ids[0]!]!.after[0]!.text);
    expect(solved.then).toBe(1);
    // solved out of order: on to the first still open
    expect(solvedRun(story, ids, [ids[1]!], ids[1]!).then).toBe(0);
    const last = solvedRun(story, ids, ids, ids[2]!);
    expect(last.then).toBeNull();
    expect(last.steps.at(-1)!.findings).toEqual(story.closing.findings);

    // told again: stops at the mission not solved yet, and says nothing about it
    const partway = replayRun(story, ids, [ids[0]!]);
    expect(partway.then).toBe(1);
    expect(partway.steps.map((step) => step.text)).not.toContain(story.missions[ids[1]!]!.after[0]!.text);
    expect(replayRun(story, ids, ids).then).toBeNull();
  });
}

// ---- in the classroom ------------------------------------------------------------------------

// Software WebGL draws the room behind the bench, so these are slow on a busy machine.
test.beforeEach(({ page: _page }, info) => {
  if (info.title.includes(":")) return;
  info.setTimeout(90_000);
});

const story = (page: Page) => page.getByTestId("lab-story");
const next = (page: Page, name = "Lanjut") => story(page).getByRole("button", { name, exact: true }).click();

async function openLab(page: Page, lab: string, seen = false) {
  if (seen) await page.addInitScript((key) => localStorage.setItem(`nalar:lab-story:${key}`, "1"), lab);
  await page.goto(`/tests/fixtures/classroom.html?station=lab&lab=${lab}`);
  await expect(page.locator("svg.iso-svg").first()).toBeVisible({ timeout: 30_000 });
}

test("a first visit opens with the story, rings each part and waits for the student to try it", async ({ page }) => {
  await openLab(page, "mikroskop-osmosis");
  await expect(story(page)).toContainText("Malam pertamamu");
  await expect(page.getByRole("button", { name: "Teteskan" })).toBeDisabled();
  await next(page);
  await next(page);

  await expect(page.getByTestId("lab-pointer")).toHaveAttribute("data-part", "pipet");
  await expect(story(page).getByRole("button", { name: "Lanjut", exact: true })).toBeDisabled();
  // mission 1 locks the ring, the tour does not
  const ring = page.getByRole("slider", { name: "Kadar garam di pipet" });
  await expect(ring).toHaveAttribute("aria-disabled", "false");
  await ring.focus();
  await page.keyboard.press("ArrowUp");
  await next(page);
  await expect(page.getByTestId("lab-pointer")).toHaveAttribute("data-part", "lensa");
  await next(page);
  await next(page, "Lanjut");

  await expect(story(page)).toContainText("Tes pertama");
  await expect(ring).toHaveAttribute("aria-disabled", "true");
  await expect(ring).toHaveAttribute("aria-valuenow", "0");
  await next(page, "Mulai misi");
  await expect(story(page)).toHaveCount(0);
  await expect(page.getByTestId("lab-pointer")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("nalar:lab-story:mikroskop-osmosis"))).toBe("1");
});

test("a solved mission is explained, and the story moves on to the next one", async ({ page }) => {
  await openLab(page, "mikroskop-osmosis", true);
  await next(page, "Mulai misi");
  await page.getByRole("radio", { name: "Air masuk sel" }).click();
  await page.getByRole("button", { name: "Teteskan" }).click();
  await expect(story(page)).toContainText("zat terlarut", { timeout: 10_000 });
  await next(page);
  await next(page);
  await expect(story(page)).toContainText("Kak Rani mengangguk");
  await expect(page.getByRole("tab", { name: "Misi 2" })).toHaveAttribute("aria-selected", "true");
});

test("on a short screen, the panel moves clear of the part it is talking about", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 720 });
  await openLab(page, "reaktor-tumbukan");
  await next(page);
  await next(page);
  await expect(page.getByTestId("lab-pointer")).toHaveAttribute("data-part", "pemanas");
  await expect
    .poll(async () => {
      const part = (await page.locator('[data-lab-part="pemanas"]').boundingBox())!;
      const panel = (await story(page).boundingBox())!;
      return part.y + part.height <= panel.y;
    })
    .toBe(true);
});

test("the last mission ends the story with what the student found", async ({ page }, info) => {
  info.setTimeout(240_000);
  await openLab(page, "mikroskop-osmosis", true);
  await next(page, "Mulai misi");
  await page.getByRole("radio", { name: "Air masuk sel" }).click();
  await page.getByRole("button", { name: "Teteskan" }).click();
  await expect(story(page)).toContainText("zat terlarut", { timeout: 10_000 });
  await next(page);
  await next(page);
  await next(page);
  await next(page, "Mulai misi");

  const ring = page.getByRole("slider", { name: "Kadar garam di pipet" });
  await ring.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "Teteskan" }).click();
  await expect(story(page)).toContainText("larutan isotonis", { timeout: 10_000 });
  await next(page);
  await next(page);
  await next(page);
  await next(page, "Mulai misi");

  await ring.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowUp");
  await page.getByRole("button", { name: "Teteskan" }).click();
  await expect(story(page)).toContainText("plasmolisis", { timeout: 10_000 });
  await next(page);
  await next(page);
  await expect(story(page).getByRole("listitem")).toHaveCount(3);
  await expect(story(page).getByRole("button", { name: "Lewati" })).toHaveCount(0);
  if (process.env.STORY_SHOT) await page.screenshot({ path: process.env.STORY_SHOT });
  await next(page, "Selesai");
  await expect(story(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Putar ulang cerita" })).toBeVisible();
});

test("skipping goes straight to the mission and the story can be told again", async ({ page }) => {
  await openLab(page, "reaktor-tumbukan");
  await story(page).getByRole("button", { name: "Lewati" }).click();
  await expect(story(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reaksikan" })).toBeEnabled();
  await page.getByRole("button", { name: "Putar ulang cerita" }).click();
  await expect(story(page)).toContainText("Hari pertamamu");
});

test("a return visit skips the opening, and picking a mission puts the story away", async ({ page }) => {
  await openLab(page, "gerak-parabola", true);
  await expect(story(page)).toContainText("Titik jemput pertama");
  await page.getByRole("tab", { name: "Misi 3" }).click();
  await expect(story(page)).toHaveCount(0);
});
