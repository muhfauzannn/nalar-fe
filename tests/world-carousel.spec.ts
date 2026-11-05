import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { createServer } from "vite";
import { carouselIndex, worldSwipeDirection } from "../app/features/lms/world3d/carousel";
import { frameWorld } from "../app/features/lms/world3d/world-camera";
import type { WorldData } from "../app/features/lms/types";

let WorldIslandCarousel: typeof import("../app/features/lms/components/world-island-carousel").WorldIslandCarousel;
test.beforeAll(async () => {
  const server = await createServer({ configFile: "tests/vite.config.ts", server: { middlewareMode: true, hmr: false } });
  try {
    ({ WorldIslandCarousel } = await server.ssrLoadModule("/app/features/lms/components/world-island-carousel.tsx"));
  } finally {
    await server.close();
  }
});

test("the carousel presents one course with previous and next controls", () => {
  const islands = [
    { id: "course-a", subjectName: "Fisika", name: "Kelas A" },
    { id: "course-b", subjectName: "Fisika", name: "Kelas B" },
  ].map((course) => ({ course })) as WorldData["islands"];
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorldIslandCarousel, { islands })));
  expect(html).toContain('href="/courses/course-a/kelas"');
  expect(html).not.toContain('href="/courses/course-b/kelas"');
  expect(html).toContain('aria-label="Pulau sebelumnya"');
  expect(html).toContain('aria-label="Pulau berikutnya"');
  expect(html).toContain("Kelas A");
  expect(html).toContain("1 / 3");
  expect(html).not.toContain("Pilih pulau");
});

test("the carousel is absent when there are no islands", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorldIslandCarousel, { islands: [] })));
  expect(html).toBe("");
});

test("carousel navigation wraps and includes the join island", () => {
  expect(carouselIndex(-1, 4)).toBe(3);
  expect(carouselIndex(4, 4)).toBe(0);
  expect(carouselIndex(2, 4)).toBe(2);
  expect(carouselIndex(12, 0)).toBe(0);
});

test("only an intentional horizontal swipe changes island", () => {
  expect(worldSwipeDirection(-80, 8)).toBe(1);
  expect(worldSwipeDirection(80, 8)).toBe(-1);
  expect(worldSwipeDirection(20, 2)).toBe(0);
  expect(worldSwipeDirection(70, 90)).toBe(0);
});

test("each island gets a distinct camera target in carousel view", () => {
  const first = frameWorld([{ position: [0, 0, 0], radius: 10 }], 390, 700);
  const second = frameWorld([{ position: [28, 0, 15], radius: 10 }], 390, 700);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(first!.zoom).toBeCloseTo(second!.zoom);
  expect(first!.target).not.toEqual(second!.target);
});
