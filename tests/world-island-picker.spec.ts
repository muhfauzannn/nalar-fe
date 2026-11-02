import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { createServer } from "vite";
import type { WorldData } from "../app/features/lms/types";

let WorldIslandPicker: typeof import("../app/features/lms/components/world-island-picker").WorldIslandPicker;
test.beforeAll(async () => {
  const server = await createServer({
    configFile: "tests/vite.config.ts",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    ({ WorldIslandPicker } = await server.ssrLoadModule(
      "/app/features/lms/components/world-island-picker.tsx",
    ));
  } finally {
    await server.close();
  }
});

test("the touch picker provides a separate course link for every island", () => {
  const islands = [
    { id: "course-a", subjectName: "Fisika", name: "Kelas A" },
    { id: "course-b", subjectName: "Fisika", name: "Kelas B" },
    { id: "course-c", subjectName: "Kimia", name: "Kelas C" },
    { id: "course-d", subjectName: "Biologi", name: "Kelas D" },
  ].map((course) => ({ course })) as WorldData["islands"];
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(WorldIslandPicker, { islands }),
    ),
  );
  for (const { course } of islands) {
    expect(html).toContain(`href="/courses/${course.id}"`);
    expect(html).toContain(`Buka pulau ${course.subjectName}, ${course.name}`);
  }
  expect(html).toContain('aria-label="Pilih pulau"');
  expect(html).toContain("overflow-x-auto");
});

test("no picker is shown when the student has no islands", () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(WorldIslandPicker, { islands: [] }),
    ),
  );
  expect(html).toBe("");
});
