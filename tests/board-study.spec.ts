import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { studyPdf } from "./fixtures/pdf";

// The classroom board with a PDF on it (fixtures/classroom.html?station=papan&pdf=1):
// the tutor spirit's bubble talks to the same Live tutor as the lesson page's study
// room. Gemini Live is replaced by a socket the test drives.

type Context = {
  resourceId: string;
  page: number;
  revision: number;
  turnId: string;
  blocks: Array<{ id: string; text: string }>;
};

const headers = {
  "access-control-allow-origin": "http://127.0.0.1:4174",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
};

async function openBoard(page: Page, search = "station=papan&pdf=1") {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/student/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (route.request().url().includes("/file"))
      return route.fulfill({ body: studyPdf(), contentType: "application/pdf", headers });
    const resourceId = route.request().postDataJSON().resourceId;
    return route.fulfill({
      json: {
        token: "auth_tokens/test",
        model: "gemini-3.8-live",
        resourceId,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      headers,
    });
  });

  let socket: WebSocketRoute | undefined;
  let view: Context | undefined;
  let sockets = 0;
  let closed = 0;
  const texts: string[] = [];
  const responses = new Map<string, Record<string, any>>();
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    sockets++;
    ws.onClose(() => closed++);
    ws.onMessage((raw) => {
      const data = JSON.parse(raw.toString());
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
      for (const item of data.clientContent?.turns ?? []) {
        for (const part of item.parts ?? []) {
          // A typed question carries the open page with it (PDF_CONTEXT); a spoken one sends it first.
          if (part.text?.startsWith("PDF_VIEW_STATE ")) view = JSON.parse(part.text.slice(15));
          if (part.text?.startsWith("PDF_CONTEXT ")) view = JSON.parse(part.text.slice(12));
        }
        if (data.clientContent.turnComplete) {
          const question = item.parts?.filter((part: any) => part.text && !part.text.startsWith("PDF_")).at(-1)?.text;
          if (question) texts.push(question);
        }
      }
      for (const response of data.toolResponse?.functionResponses ?? []) responses.set(response.id, response.response);
    });
  });

  await page.goto(`/tests/fixtures/classroom.html?${search}`);

  const send = (value: unknown) => {
    if (!socket) throw new Error("No socket");
    socket.send(JSON.stringify(value));
  };
  const call = async (id: string, name: string, args = {}) => {
    send({ toolCall: { functionCalls: [{ id, name, args }] } });
    await expect.poll(() => responses.has(id)).toBe(true);
    return responses.get(id)!;
  };
  const guidance = (context: Context, actions: unknown[]) => ({
    resourceId: context.resourceId,
    page: context.page,
    revision: context.revision,
    turnId: context.turnId,
    caption: "Pembilang adalah bagian yang dipilih",
    actions,
  });
  const bubble = page.getByRole("region", { name: "Tutor AI" });
  const summon = async () => {
    await page.getByRole("button", { name: "Panggil tutor" }).click();
    await expect(bubble).toBeVisible();
  };
  const ask = async (question: string) => {
    const composer = bubble.getByRole("textbox", { name: "Pesan untuk tutor" });
    await composer.fill(question);
    await composer.press("Enter");
    await expect.poll(() => texts).toContain(question);
  };
  return {
    errors,
    texts,
    bubble,
    summon,
    ask,
    send,
    call,
    guidance,
    getView: () => view,
    getSockets: () => sockets,
    getClosed: () => closed,
  };
}

// The room flies the camera to the board before the PDF appears.
const SETTLE = { timeout: 30_000 };

test.beforeEach(({}, info) => info.setTimeout(60_000));

test("the spirit reads the PDF on the board, answers in the bubble and points at the page", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  // The open page reached the tutor with the question.
  expect(mock.getView()?.page).toBe(1);

  const context = (await mock.call("read-1", "get_pdf_context")) as Context;
  expect(context.blocks.some((block) => block.text.includes("Pembilang"))).toBe(true);
  const drawn = await mock.call(
    "draw-1",
    "present_pdf_guidance",
    mock.guidance(context, [{ kind: "highlight", blockId: context.blocks[1]!.id }]),
  );
  expect(drawn.ok).toBe(true);
  // The pointer is drawn on the board's page, not in the bubble.
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");

  mock.send({
    serverContent: { outputTranscription: { text: "Pembilang adalah angka di atas garis." }, turnComplete: true },
  });
  const thread = mock.bubble.getByLabel("Transkrip percakapan saat ini");
  await expect(thread.locator('[data-author="student"]')).toHaveText("Apa itu pembilang?");
  await expect(thread.locator('[data-author="tutor"]')).toHaveText("Pembilang adalah angka di atas garis.");
  expect(mock.errors).toEqual([]);
});

test("the spirit looks at the spot the tutor points at, and faces front again when the pointer goes", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  const corner = page.locator(".spirit-corner");
  await expect(corner).toHaveAttribute("data-gazing", "false");

  const context = (await mock.call("read-1", "get_pdf_context")) as Context;
  const drawn = await mock.call(
    "draw-1",
    "present_pdf_guidance",
    mock.guidance(context, [{ kind: "highlight", blockId: context.blocks[1]!.id }]),
  );
  expect(drawn.ok).toBe(true);
  await expect(page.locator("[data-tutor-pointer]")).toBeVisible();
  await expect(corner).toHaveAttribute("data-gazing", "true");

  await mock.bubble.getByRole("button", { name: "Bersihkan" }).click();
  await expect(page.locator("[data-tutor-pointer]")).toHaveCount(0);
  await expect(corner).toHaveAttribute("data-gazing", "false");
  expect(mock.errors).toEqual([]);
});

// Where the spirit is looking, read from the app's own store (the same module instance the page runs).
const spiritGaze = (page: Page) =>
  page.evaluate(async () => {
    const path = "/app/features/lms/world3d/spirit-store.ts";
    const { spirit } = await import(/* @vite-ignore */ path);
    return spirit.get().gaze as { x: number; y: number } | null;
  });

// The tip of the tutor's arrow on the screen, as the spirit is meant to read it.
const arrowTip = (page: Page) =>
  page.locator("[data-tutor-pointer]").evaluate((arrow) => {
    const box = arrow.getBoundingClientRect();
    return { x: box.left + 3, y: box.top + 3 };
  });

test("the spirit's gaze stays on the arrow's tip as the cursor moves from line to line", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  expect(await spiritGaze(page)).toBeNull();

  const context = (await mock.call("read-1", "get_pdf_context")) as Context;
  const { actions: _actions, ...identity } = mock.guidance(context, []);
  const seen: Array<{ x: number; y: number }> = [];
  for (const [index, block] of [context.blocks[0]!, context.blocks[1]!].entries()) {
    const moved = await mock.call(`cursor-${index}`, "move_pdf_cursor", { ...identity, blockId: block.id, caption: "Lihat ini" });
    expect(moved.ok).toBe(true);
    // The cursor glides for a moment: first wait until it has left the last line, so that "the gaze is on the
    // tip" is not met by a cursor that has not moved yet, then until it rests and the gaze is on its tip.
    if (seen.length) await expect.poll(async () => Math.abs((await arrowTip(page)).y - seen.at(-1)!.y)).toBeGreaterThan(10);
    await expect
      .poll(async () => {
        const [gaze, tip] = [await spiritGaze(page), await arrowTip(page)];
        return gaze ? Math.hypot(gaze.x - tip.x, gaze.y - tip.y) : Infinity;
      })
      .toBeLessThan(2);
    seen.push((await spiritGaze(page))!);
  }
  // Two different lines, two different places to look at.
  expect(Math.abs(seen[0]!.y - seen[1]!.y)).toBeGreaterThan(10);
  expect(mock.errors).toEqual([]);
});

test("closing the bubble while the tutor points puts the spirit's gaze away", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  const context = (await mock.call("read-1", "get_pdf_context")) as Context;
  await mock.call("draw-1", "present_pdf_guidance", mock.guidance(context, [{ kind: "highlight", blockId: context.blocks[1]!.id }]));
  await expect(page.locator(".spirit-corner")).toHaveAttribute("data-gazing", "true");
  expect(await spiritGaze(page)).not.toBeNull();

  await mock.bubble.getByRole("button", { name: "Tutup tutor" }).click();
  await expect(page.locator(".spirit-corner")).toHaveAttribute("data-gazing", "false");
  expect(await spiritGaze(page)).toBeNull();
  expect(mock.errors).toEqual([]);
});

test("leaving the board while the tutor points leaves no stale gaze behind", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  const context = (await mock.call("read-1", "get_pdf_context")) as Context;
  await mock.call("draw-1", "present_pdf_guidance", mock.guidance(context, [{ kind: "highlight", blockId: context.blocks[1]!.id }]));
  await expect(page.locator(".spirit-corner")).toHaveAttribute("data-gazing", "true");

  await page.getByRole("link", { name: "Kembali melihat kelas" }).click();
  // Leaving flies the camera back and draws the room again, which is slow on a busy machine.
  await expect.poll(() => spiritGaze(page), SETTLE).toBeNull();
  expect(mock.errors).toEqual([]);
});

// The tutor's dock floats over the bottom of the board and moves nothing: not the page, not the reader,
// not its scroll area. It is a little see-through, and its thread fades out toward the top.
const alpha = (colour: string) => {
  const match = /rgba?\(([^)]+)\)/.exec(colour);
  const parts = match?.[1]?.split(",").map((part) => parseFloat(part)) ?? [];
  return parts.length === 4 ? parts[3]! : 1;
};
const sameBox = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => {
  expect(a.x).toBeCloseTo(b.x, 0);
  expect(a.y).toBeCloseTo(b.y, 0);
  expect(a.width).toBeCloseTo(b.width, 0);
  expect(a.height).toBeCloseTo(b.height, 0);
};

for (const [name, viewport] of [
  ["a desktop", { width: 1280, height: 960 }],
  ["a tablet", { width: 768, height: 1024 }],
  ["a phone", { width: 390, height: 844 }],
] as const) {
  test(`the tutor's dock floats over the PDF and moves nothing on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const mock = await openBoard(page);
    const parts = {
      reader: page.locator("[data-board-reader] > *"),
      sheet: page.locator("[data-board-reader] canvas"),
      scroller: page.getByTestId("pdf-scroll-host"),
      surface: page.locator("[data-classroom-surface]"),
    };
    const measure = async () => ({
      reader: (await parts.reader.boundingBox())!,
      sheet: (await parts.sheet.boundingBox())!,
      scroller: (await parts.scroller.boundingBox())!,
      surface: (await parts.surface.boundingBox())!,
    });
    await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
    const before = await measure();
    const roomBefore = await parts.scroller.evaluate((element) => element.scrollHeight - element.clientHeight);

    await mock.summon();
    // The dock rises in with a transform; look at it once it has settled.
    await expect.poll(() => mock.bubble.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
    const slim = (await mock.bubble.boundingBox())!;

    // It floats (absolute, bottom of the screen), slim, and over the board: nothing under it has moved.
    expect(await mock.bubble.evaluate((element) => getComputedStyle(element).position)).toBe("absolute");
    expect(slim.height).toBeLessThan(viewport.height * 0.2);
    expect(slim.y + slim.height).toBeGreaterThan(viewport.height - 40);
    const open = await measure();
    for (const key of ["reader", "sheet", "scroller", "surface"] as const) sameBox(open[key], before[key]);
    // Scrolled to its end, the page has its bottom up above the dock.
    const bottomClear = await parts.scroller.evaluate((element, top) => {
      element.scrollTo(0, element.scrollHeight);
      const sheet = element.querySelector("canvas")!.getBoundingClientRect();
      element.scrollTo(0, 0);
      return sheet.bottom <= top + 1;
    }, slim.y);
    expect(bottomClear).toBe(true);

    // Its base is a little see-through, not solid.
    const base = mock.bubble.locator("> div").last();
    expect(alpha(await base.evaluate((element) => getComputedStyle(element).backgroundColor))).toBeLessThan(1);
    expect(alpha(await base.evaluate((element) => getComputedStyle(element).backgroundColor))).toBeGreaterThan(0.5);

    // Expanding it changes the dock, still nothing under it.
    await mock.bubble.getByRole("button", { name: "Perluas percakapan" }).click();
    await expect(mock.bubble.getByRole("button", { name: "Ciutkan percakapan" })).toHaveAttribute("aria-expanded", "true");
    const expanded = await measure();
    for (const key of ["reader", "sheet", "scroller", "surface"] as const) sameBox(expanded[key], before[key]);
    await mock.bubble.getByRole("button", { name: "Ciutkan percakapan" }).click();

    // Closing it leaves everything where it was.
    await mock.bubble.getByRole("button", { name: "Tutup tutor" }).click();
    await expect(mock.bubble).toHaveCount(0);
    const after = await measure();
    for (const key of ["reader", "sheet", "scroller", "surface"] as const) sameBox(after[key], before[key]);
    expect(await parts.scroller.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(roomBefore);
    expect(mock.errors).toEqual([]);
  });
}

test("the dock's thread is see-through and fades out toward the top, more of it when expanded", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  mock.send({ serverContent: { outputTranscription: { text: "Pembilang adalah angka di atas garis." }, turnComplete: true } });
  const thread = mock.bubble.getByLabel("Transkrip percakapan saat ini");
  await expect(thread.locator('[data-author="tutor"]')).toHaveText("Pembilang adalah angka di atas garis.");

  const look = () =>
    thread.evaluate((element) => {
      const style = getComputedStyle(element);
      return { mask: style.maskImage || style.webkitMaskImage, background: style.backgroundColor, height: element.getBoundingClientRect().height };
    });
  const slim = await look();
  // a gradient mask that goes from solid at the bottom to nothing at the top, over a see-through background
  expect(slim.mask).toContain("linear-gradient");
  expect(slim.mask).toContain("to top");
  expect(alpha(slim.background)).toBeLessThan(1);

  await mock.bubble.getByRole("button", { name: "Perluas percakapan" }).click();
  await expect.poll(async () => (await look()).height).toBeGreaterThan(slim.height * 1.5);
  expect((await look()).mask).toContain("linear-gradient");
  expect(mock.errors).toEqual([]);
});

test("closing the bubble hangs up the session, and the next question opens a new one", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  await expect.poll(() => mock.getSockets()).toBe(1);

  await mock.bubble.getByRole("button", { name: "Tutup tutor" }).click();
  await expect(mock.bubble).toHaveCount(0);
  await expect.poll(() => mock.getClosed()).toBe(1);

  await mock.summon();
  await mock.ask("Lalu penyebut?");
  await expect.poll(() => mock.getSockets()).toBe(2);
  expect(mock.errors).toEqual([]);
});

test("leaving the board hangs up the session", async ({ page }) => {
  const mock = await openBoard(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", SETTLE);
  await mock.summon();
  await mock.ask("Apa itu pembilang?");
  await expect.poll(() => mock.getSockets()).toBe(1);

  await page.getByRole("link", { name: "Kembali melihat kelas" }).click();
  await expect.poll(() => mock.getClosed(), SETTLE).toBe(1);
  expect(mock.errors).toEqual([]);
});

test("a lesson with only text on the board says so instead of promising a reading", async ({ page }) => {
  const mock = await openBoard(page, "station=papan");
  await expect(page.getByLabel("Papan materi")).toContainText("Amati perubahan gerak balok", SETTLE);
  await mock.summon();
  await expect(mock.bubble).toContainText("berupa teks");
  await expect(mock.bubble.getByRole("textbox", { name: "Pesan untuk tutor" })).toHaveCount(0);
  expect(mock.getSockets()).toBe(0);
  expect(mock.errors).toEqual([]);
});
