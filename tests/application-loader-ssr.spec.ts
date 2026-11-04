import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { PageReadiness } from "../app/features/loading/readiness";
let readinessContext: typeof import("../app/features/loading/context");

let Loader: typeof import("../app/features/loading/application-loader").ApplicationLoader;
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  const server = await createServer({
    configFile: "tests/vite.config.ts",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    readinessContext = (await server.ssrLoadModule(
      "/app/features/loading/context.ts",
    )) as typeof readinessContext;
    ({ ApplicationLoader: Loader } = await server.ssrLoadModule(
      "/app/features/loading/application-loader.tsx",
    ));
  } finally {
    await server.close();
  }
});

test("initial world HTML includes the loader poster without needing JavaScript or another image request", () => {
  const html = renderToStaticMarkup(
    createElement(Loader, { pathname: "/dunia", initial: true }),
  );
  expect(html).toContain("Menyiapkan dunia");
  expect(html).toContain("data:image/png;base64,");
  expect(html).toContain('role="status"');
  expect(html).not.toContain("<canvas");
  expect(html).not.toContain("skeleton");
  expect(html).not.toContain("world.glb");
  expect(html).not.toContain("classroom.glb");
});

test("a failed load keeps retry accessible through the sticker without visible text", () => {
  const html = renderToStaticMarkup(
    createElement(Loader, { error: "Gambar belum dapat dimuat." }),
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Gambar belum dapat dimuat.");
  expect(html).toContain("Coba lagi dengan menekan stiker.");
  expect(html.replace(/<[^>]*>/g, "")).toBe("");
  expect(html).not.toContain("100%");
});

test("asset progress does not add visible text or a card to the sticker", () => {
  const html = renderToStaticMarkup(
    createElement(Loader, {
      state: {
        phase: "assets",
        completed: 2,
        total: 6,
        error: null,
        sceneLoading: false,
      },
    }),
  );
  expect(html.replace(/<[^>]*>/g, "")).toBe("");
  expect(html).not.toContain("<h1");
  expect(html).not.toContain("<p");
  expect(html).not.toContain("bg-white");
  expect(html).not.toContain("rounded-");
  expect(html).not.toContain("33%");
});

test("welcome effects can distinguish a visible page from one still behind the loader", () => {
  const session = new PageReadiness("dashboard", false);
  function Probe() {
    return createElement(
      "span",
      null,
      readinessContext.usePageReady() ? "visible" : "deferred",
    );
  }
  const render = () =>
    renderToStaticMarkup(
      createElement(
        readinessContext.PageReadinessContext.Provider,
        { value: session },
        createElement(Probe),
      ),
    );
  expect(render()).toContain("deferred");
  session.setResource("assets", true);
  expect(render()).toContain("visible");
  expect(renderToStaticMarkup(createElement(Probe))).toContain("visible");
});
