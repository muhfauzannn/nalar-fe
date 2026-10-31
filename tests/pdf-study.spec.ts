import { test, expect, type Page, type WebSocketRoute } from "@playwright/test";
import { studyPdf, scannedPdf } from "./fixtures/pdf";
import { mkdir, writeFile } from "node:fs/promises";

type Context = {
  resourceId: string;
  page: number;
  revision: number;
  turnId: string;
  blocks: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};
async function setup(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const audio = new AudioContext();
        const destination = audio.createMediaStreamDestination();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        return destination.stream;
      },
    });
  });
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:4174",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
  };
  await page.route("**/api/student/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().url().includes("/file"))
      return route.fulfill({
        body: studyPdf(),
        contentType: "application/pdf",
        headers,
      });
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
  const responses = new Map<string, Record<string, any>>();
  let view: Context | undefined;
  let images = 0;
  const clientMessages: any[] = [];
  const appendedBytes: number[] = [];
  const texts: string[] = [];
  // What reached the tutor, in order: "history:…" or "text:…", and how many sockets opened/closed.
  const order: string[] = [];
  let sockets = 0;
  let closed = 0;
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    sockets++;
    ws.onClose(() => closed++);
    ws.onMessage((raw) => {
      const data = JSON.parse(raw.toString());
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
      if (data.clientContent) clientMessages.push(data.clientContent);
      for (const item of data.clientContent?.turns ?? []) {
        for (const part of item.parts ?? []) {
          const text = part.text;
          if (text?.startsWith("PDF_VIEW_STATE ")) view = JSON.parse(text.slice(15));
          if (text?.startsWith("PDF_CONTEXT ")) view = JSON.parse(text.slice(12));
          if (text?.startsWith("CONVERSATION_HISTORY")) order.push(`history:${text}`);
          if (part.inlineData?.mimeType === "image/jpeg") images++;
        }
        if (data.clientContent.turnComplete) {
          const question = item.parts?.filter((part: any) => part.text && !part.text.startsWith("PDF_CONTEXT ")).at(-1)?.text;
          if (question) { texts.push(question); order.push(`text:${question}`); }
        }
      }
      if (data.realtimeInput?.text) {
        texts.push(data.realtimeInput.text);
        order.push(`text:${data.realtimeInput.text}`);
      }
      if (data.realtimeInput?.audio)
        appendedBytes.push(Buffer.from(data.realtimeInput.audio.data, "base64").length);
      if (
        data.realtimeInput?.video ||
        data.realtimeInput?.mediaChunks?.some(
          (part: { mimeType: string }) => part.mimeType === "image/jpeg",
        )
      )
        images++;
      for (const response of data.toolResponse?.functionResponses ?? []) {
        responses.set(response.id, response.response);
        if (response.name === "get_pdf_context" && response.response.blocks) view = response.response;
      }
    });
  });
  await page.goto("/tests/fixtures/pdf-study.html");
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  const send = (value: unknown) => {
    if (!socket) throw new Error("No socket");
    socket.send(JSON.stringify(value));
  };
  const call = async (id: string, name: string, args = {}) => {
    send({ toolCall: { functionCalls: [{ id, name, args }] } });
    await expect.poll(() => responses.has(id)).toBe(true);
    return responses.get(id)!;
  };
  const start = async () => {
    await page.getByRole("button", { name: "Mulai percakapan" }).click();
    await expect(
      page.getByRole("button", { name: "Jeda mikrofon" }),
    ).toBeVisible();
    await expect.poll(() => view?.page).toBe(1);
  };
  const ground = async (id: string) => {
    send({
      serverContent: {
        inputTranscription: { text: "Jelaskan pembilang pada bagian ini." },
      },
    });
    return (await call(id, "get_pdf_context")) as Context;
  };
  const guidance = (
    ctx: Context,
    actions: unknown[] = [{ kind: "highlight", blockId: ctx.blocks[1].id }],
  ) => ({
    resourceId: ctx.resourceId,
    page: ctx.page,
    revision: ctx.revision,
    turnId: ctx.turnId,
    caption: "Pembilang adalah bagian yang dipilih",
    actions,
  });
  return {
    errors,
    clientMessages,
    start,
    ground,
    call,
    send,
    guidance,
    responses,
    getView: () => view,
    getImages: () => images,
    appendedBytes,
    texts,
    order,
    getSockets: () => sockets,
    getClosed: () => closed,
  };
}

test("an idle text-only session is closed, and the next question reopens it with the thread", async ({
  page,
}) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Apa itu pembilang?");
  await composer.press("Enter");
  await expect.poll(() => mock.texts).toEqual(["Apa itu pembilang?"]);
  await mock.call("idle-read", "get_pdf_context");
  mock.send({
    serverContent: { outputTranscription: { text: "Angka di atas garis." }, turnComplete: true },
  });
  const thread = page.getByLabel("Transkrip percakapan saat ini");
  await expect(thread.locator('[data-author="tutor"]')).toHaveText("Angka di atas garis.");
  await expect(page.getByRole("button", { name: "Akhiri sesi" })).toBeVisible();

  await page.clock.fastForward(59_000);
  expect(mock.getClosed()).toBe(0);
  await page.clock.fastForward(2_000);
  await expect.poll(() => mock.getClosed()).toBe(1);
  await expect(page.getByRole("button", { name: "Akhiri sesi" })).toHaveCount(0);
  // The thread stays where it was.
  await expect(thread.locator('[data-author]')).toHaveCount(2);

  await composer.fill("Lalu penyebut?");
  await composer.press("Enter");
  await expect.poll(() => mock.getSockets()).toBe(2);
  await expect.poll(() => mock.texts).toEqual(["Apa itu pembilang?", "Lalu penyebut?"]);
  // The new session heard the earlier turns before the new question.
  const history = mock.order.findIndex((entry) => entry.startsWith("history:"));
  expect(history).toBeGreaterThan(-1);
  expect(mock.order[history]).toContain("Siswa: Apa itu pembilang?");
  expect(mock.order[history]).toContain("NALAR: Angka di atas garis.");
  expect(history).toBeLessThan(mock.order.indexOf("text:Lalu penyebut?"));
  expect(mock.errors).toEqual([]);
});

test("a typed question opens a text-only session; voice can join the same conversation later", async ({
  page,
}) => {
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  const thread = page.getByLabel("Transkrip percakapan saat ini");
  await composer.fill("Apa itu pembilang?");
  await composer.press("Enter");
  await expect(composer).toHaveValue("");
  await expect.poll(() => mock.texts).toEqual(["Apa itu pembilang?"]);
  // The page reached the tutor before the question did, and no microphone was opened.
  expect(mock.getView()?.page).toBe(1);
  await expect(thread.locator('[data-author="student"]')).toHaveText("Apa itu pembilang?");
  await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toHaveCount(0);
  expect(mock.appendedBytes).toHaveLength(0);

  const context = (await mock.call("text-read", "get_pdf_context")) as Context;
  expect(context.turnId).toBeTruthy();
  mock.send({
    serverContent: {
      outputTranscription: { text: "Pembilang adalah angka di atas garis." },
      modelTurn: {
        parts: [{ inlineData: { data: Buffer.alloc(4_800).toString("base64"), mimeType: "audio/pcm;rate=24000" } }],
      },
      turnComplete: true,
    },
  });
  await expect(thread.locator('[data-author="tutor"]')).toHaveText("Pembilang adalah angka di atas garis.");
  // A typed question is answered in text: nothing is played, so no voice bar appears.
  await expect(page.getByRole("status").filter({ hasText: "Menjelaskan" })).toHaveCount(0);

  await page.getByRole("button", { name: "Mulai percakapan suara" }).click();
  await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
  await expect.poll(() => mock.appendedBytes.length).toBeGreaterThan(0);
  // Typing while talking keeps the microphone open and the earlier turns in place.
  await composer.fill("Lalu penyebut?");
  await page.getByRole("button", { name: "Kirim pesan" }).click();
  await expect.poll(() => mock.texts).toEqual(["Apa itu pembilang?", "Lalu penyebut?"]);
  await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toBeVisible();
  await expect(thread.locator('[data-author="student"]')).toHaveText(["Apa itu pembilang?", "Lalu penyebut?"]);

  await page.getByRole("button", { name: "Matikan suara" }).click();
  await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mulai percakapan suara" })).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("renders original PDF, selectable text, geometry, zoom, rotation and a second page", async ({
  page,
}) => {
  const mock = await setup(page);
  await expect(page.locator(".pdf-study-text-layer")).toContainText(
    "Pembilang menunjukkan",
  );
  await page
    .locator(".pdf-study-text-layer span")
    .filter({ hasText: "Pembilang" })
    .click();
  await expect(page.getByTestId("pdf-selection")).toBeVisible();
  await page.getByRole("button", { name: "Perbesar PDF" }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  await expect(page.getByTestId("pdf-selection")).toBeVisible();
  await page.getByRole("button", { name: "Putar PDF" }).click();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  await expect(page.getByTestId("pdf-selection")).toBeVisible();
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.getByTestId("pdf-page-number")).toHaveText("2 / 2");
  await expect(page.locator(".pdf-study-text-layer")).toContainText(
    "Membandingkan pecahan",
  );
  await expect(page.getByTestId("pdf-selection")).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});

test("voice tools ground the response, show cursor, draw and reject an outdated page", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-1");
  expect(context.blocks.some((b) => b.text.includes("Pembilang"))).toBe(true);
  expect(mock.getImages()).toBeGreaterThan(0);
  const result = await mock.call(
    "draw-1",
    "present_pdf_guidance",
    mock.guidance(context, [
      { kind: "highlight", blockId: context.blocks[1].id },
      { kind: "text", x: 0.1, y: 0.25, text: "Contoh: satu dari dua bagian" },
      { kind: "arrow", x: 0.25, y: 0.27, width: 0.1, height: 0.05 },
    ]),
  );
  expect(result.ok).toBe(true);
  await expect(page.getByTestId("tutor-cursor")).toContainText("Pembilang");
  // A highlight is one horizontal stroke: its box is 0px high, which toBeVisible calls hidden.
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");
  await expect(page.getByTestId("tutor-note")).toContainText("Contoh");
  mock.send({
    serverContent: {
      outputTranscription: {
        text: "Pembilang menunjukkan bagian yang dipilih. Coba jelaskan kembali.",
      },
      modelTurn: {
        parts: [
          {
            inlineData: {
              data: Buffer.alloc(48_000).toString("base64"),
              mimeType: "audio/pcm;rate=24000",
            },
          },
        ],
      },
    },
  });
  await expect(page.getByLabel("Transkrip percakapan saat ini")).toContainText(
    "Coba jelaskan kembali",
  );
  await page.screenshot({
    path: "test-results/pdf-tutor-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.locator(".pdf-study-text-layer")).toContainText(
    "Membandingkan pecahan",
  );
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(
    (await mock.call("stale", "present_pdf_guidance", mock.guidance(context)))
      .ok,
  ).toBe(false);
  await expect(page.getByTestId("tutor-highlight")).toHaveCount(0);
  await page.getByRole("button", { name: "Akhiri sesi" }).click();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  expect(mock.errors).toEqual([]);
});

test("the microphone streams 16 kHz PCM and the same page image is not resent every turn", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  // 100 ms of 16 kHz 16-bit mono per microphone chunk.
  await expect.poll(() => mock.appendedBytes.length).toBeGreaterThan(3);
  expect(new Set(mock.appendedBytes)).toEqual(new Set([3_200]));
  expect(mock.getImages()).toBe(1);
  const first = await mock.ground("read-1");
  expect(first.page).toBe(1);
  // The model already has this page; grounding again must not re-upload it.
  expect(mock.getImages()).toBe(1);
  mock.send({
    serverContent: {
      outputTranscription: { text: "Pembilang itu bagian atas pecahan." },
      modelTurn: { parts: [{ inlineData: { data: Buffer.alloc(48_000).toString("base64"), mimeType: "audio/pcm;rate=24000" } }] },
      turnComplete: true,
    },
  });
  await expect(page.getByLabel("Transkrip percakapan saat ini")).toContainText("bagian atas");
  for (const id of ["read-2", "read-3"]) {
    mock.send({ serverContent: { interrupted: true } });
    await mock.ground(id);
  }
  // ...but after a few turns it is resent, in case truncation dropped the old one.
  expect(mock.getImages()).toBe(2);
  // A different page is always sent.
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.getByRole("button", { name: "Putar PDF" })).toBeEnabled();
  // The tutor can only be sent page 2 once the reader has measured it.
  await expect(page.getByText("Halaman 2", { exact: true })).toBeVisible();
  mock.send({ serverContent: { interrupted: true } });
  await mock.ground("read-4");
  await expect.poll(() => mock.getImages()).toBe(3);
  expect(mock.errors).toEqual([]);
});

test("turning the page while the tutor speaks keeps the answer going", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-1");
  const speak = (text: string) =>
    mock.send({
      serverContent: {
        outputTranscription: { text },
        modelTurn: {
          parts: [
            {
              inlineData: {
                data: Buffer.alloc(48_000).toString("base64"),
                mimeType: "audio/pcm;rate=24000",
              },
            },
          ],
        },
      },
    });
  speak("Pembilang menunjukkan bagian yang dipilih, ");
  const transcript = page.getByLabel("Transkrip percakapan saat ini");
  await expect(transcript).toContainText("Pembilang menunjukkan");

  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.getByTestId("pdf-page-number")).toHaveText("2 / 2");
  await expect(page.getByRole("button", { name: "Putar PDF" })).toBeEnabled();
  // Page changes stay local while responding; the next context tool reads the new page.
  expect(mock.getView()?.page).toBe(1);

  speak("sedangkan penyebut menunjukkan banyak bagian seluruhnya.");
  await expect(transcript).toContainText("Pembilang menunjukkan bagian yang dipilih");
  await expect(transcript).toContainText("penyebut menunjukkan banyak bagian");

  // Ink for the old view is refused; reading the context again allows drawing on page 2.
  expect(
    (await mock.call("stale", "present_pdf_guidance", mock.guidance(context))).ok,
  ).toBe(false);
  const fresh = (await mock.call("read-2", "get_pdf_context")) as Context;
  expect(fresh.page).toBe(2);
  expect(fresh.turnId).toBe(context.turnId);
  expect(
    (await mock.call("draw-2", "present_pdf_guidance", mock.guidance(fresh))).ok,
  ).toBe(true);
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");
  expect(mock.errors).toEqual([]);
});

test("interruptions, cancelled tool calls and manual stop clear pending guidance", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-1");
  expect(
    (await mock.call("draw-1", "present_pdf_guidance", mock.guidance(context)))
      .ok,
  ).toBe(true);
  mock.send({ toolCallCancellation: { ids: ["cancelled-draw"] } });
  mock.send({
    toolCall: {
      functionCalls: [
        {
          id: "cancelled-draw",
          name: "present_pdf_guidance",
          args: mock.guidance(context),
        },
      ],
    },
  });
  mock.send({ serverContent: { interrupted: true } });
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(
    (
      await mock.call(
        "late-draw",
        "present_pdf_guidance",
        mock.guidance(context),
      )
    ).ok,
  ).toBe(false);
  const next = await mock.ground("read-2");
  expect(next.turnId).not.toBe(context.turnId);
  expect(
    (await mock.call("draw-2", "present_pdf_guidance", mock.guidance(next))).ok,
  ).toBe(true);
  await page.getByRole("button", { name: "Hentikan penjelasan" }).click();
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(
    (
      await mock.call(
        "late-draw-2",
        "present_pdf_guidance",
        mock.guidance(next),
      )
    ).ok,
  ).toBe(false);
  expect(mock.responses.has("cancelled-draw")).toBe(false);
  await page.getByRole("button", { name: "Jeda mikrofon" }).click();
  await expect(
    page.getByRole("button", { name: "Lanjutkan mikrofon" }),
  ).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("mobile reader stays inside the viewport and PDF failures have a retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mock = await setup(page);
  await page.screenshot({
    path: "test-results/pdf-tutor-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.route("**/api/student/resources/**/file", (route) =>
    route.fulfill({
      status: 404,
      headers: {
        "access-control-allow-origin": "http://127.0.0.1:4174",
        "access-control-allow-credentials": "true",
      },
    }),
  );
  await page.reload();
  await expect(page.getByText("PDF tidak dapat ditampilkan")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Coba lagi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeDisabled();
  expect(mock.errors).toEqual([]);
});

test("committed ink remains anchored on zoom and rotation while stale commands are rejected", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-ink");
  expect(
    (await mock.call("ink", "present_pdf_guidance", mock.guidance(context))).ok,
  ).toBe(true);
  const original = await page.getByTestId("tutor-highlight").boundingBox();
  const paper = await page.getByTestId("pdf-page").boundingBox();
  await page.getByRole("button", { name: "Perbesar PDF" }).click();
  await expect(page.getByRole("button", { name: "Putar PDF" })).toBeEnabled();
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  const scaled = await page.getByTestId("tutor-highlight").boundingBox();
  const scaledPaper = await page.getByTestId("pdf-page").boundingBox();
  expect((scaled!.x - scaledPaper!.x) / scaledPaper!.width).toBeCloseTo(
    (original!.x - paper!.x) / paper!.width,
    2,
  );
  expect(
    (
      await mock.call(
        "stale-zoom",
        "present_pdf_guidance",
        mock.guidance(context),
      )
    ).ok,
  ).toBe(false);
  await page.getByRole("button", { name: "Putar PDF" }).click();
  await expect(page.getByRole("button", { name: "Putar PDF" })).toBeEnabled();
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");
  await page.getByRole("button", { name: "Bersihkan", exact: true }).click();
  await expect(page.getByTestId("tutor-highlight")).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});

test("switching documents closes the previous voice session", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-source");
  await mock.call(
    "draw-source",
    "present_pdf_guidance",
    mock.guidance(context),
  );
  await page.getByRole("combobox", { name: "Pilih PDF pembelajaran" }).click();
  await page.getByRole("option", { name: "Materi pecahan 2" }).click();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Jeda mikrofon" })).toHaveCount(
    0,
  );
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});

test("connection failure can be retried and does not prevent reading the PDF", async ({
  page,
}) => {
  const mock = await setup(page);
  await page.route("**/api/student/ai-tutor/pdf-sessions", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "AI Tutor belum dikonfigurasi pada server." },
      headers: {
        "access-control-allow-origin": "http://127.0.0.1:4174",
        "access-control-allow-credentials": "true",
      },
    }),
  );
  await page.getByRole("button", { name: "Mulai percakapan" }).click();
  await expect(
    page.getByText("AI Tutor belum dikonfigurasi pada server."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Coba sambungkan lagi" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.locator(".pdf-study-text-layer")).toContainText(
    "Membandingkan pecahan",
  );
  expect(mock.errors).toEqual([]);
});

test("a scanned PDF supplies visual evidence and accepts diagram annotations without text blocks", async ({
  page,
}) => {
  const mock = await setup(page);
  const image = await page
    .locator('[data-testid="pdf-page"] canvas')
    .evaluate((canvas: HTMLCanvasElement) => ({
      data: canvas.toDataURL("image/jpeg").split(",")[1],
      width: canvas.width,
      height: canvas.height,
    }));
  const jpeg = Buffer.from(image.data, "base64");
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/pdf-source.jpg", jpeg);
  await page.route("**/api/student/resources/**/file", (route) =>
    route.fulfill({
      body: scannedPdf(jpeg, image.width, image.height),
      contentType: "application/pdf",
      headers: {
        "access-control-allow-origin": "http://127.0.0.1:4174",
        "access-control-allow-credentials": "true",
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mulai percakapan" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Halaman berupa gambar", { exact: true }),
  ).toBeVisible();
  await mock.start();
  const context = await mock.ground("read-scan");
  expect(context.blocks).toHaveLength(0);
  expect(mock.getImages()).toBeGreaterThan(0);
  expect(
    (
      await mock.call(
        "scan-circle",
        "present_pdf_guidance",
        mock.guidance(context, [
          { kind: "ellipse", x: 0.08, y: 0.3, width: 0.3, height: 0.15 },
        ]),
      )
    ).ok,
  ).toBe(true);
  await expect(page.getByTestId("tutor-cursor")).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("cancelling a visual tool during its render frame removes the uncommitted ink", async ({
  page,
}) => {
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("read-pending");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  mock.send({
    toolCall: {
      functionCalls: [
        {
          id: "pending-ink",
          name: "present_pdf_guidance",
          args: mock.guidance(context),
        },
      ],
    },
  });
  await expect(page.getByTestId("tutor-highlight")).toBeAttached();
  mock.send({ toolCallCancellation: { ids: ["pending-ink"] } });
  await expect(page.getByTestId("tutor-highlight")).toHaveCount(0);
  await page.clock.runFor(100);
  expect(mock.responses.has("pending-ink")).toBe(false);
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});


test("writing stays busy across separate tool boundaries, then accepts the answer", async ({ page }) => {
  const mock = await setup(page);
  await page.getByRole("textbox", { name: "Pesan untuk tutor" }).fill("Tulis rumus luas");
  await page.getByRole("textbox", { name: "Pesan untuk tutor" }).press("Enter");
  await expect.poll(() => mock.texts).toEqual(["Tulis rumus luas"]);
  const context = await mock.call("write-context", "get_pdf_context") as Context;
  mock.send({ serverContent: { turnComplete: true } });
  await expect(page.getByText("Berpikir…", { exact: true })).toBeVisible();
  expect((await mock.call("write-note", "present_pdf_guidance", mock.guidance(context, [
    { kind: "text", x: 0.1, y: 0.25, text: "L = p × l" },
  ]))).ok).toBe(true);
  mock.send({ serverContent: { turnComplete: true } });
  await expect(page.getByText("Berpikir…", { exact: true })).toBeVisible();
  await expect(page.getByTestId("tutor-note")).toBeVisible();
  mock.send({ serverContent: { outputTranscription: { text: "Rumusnya sudah kutulis." }, turnComplete: true } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toHaveText("Rumusnya sudah kutulis.");
  await expect(page.getByText("Berpikir…", { exact: true })).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});

test("drag selects part of a line before release, and AI can highlight the exact quote", async ({ page }) => {
  const mock = await setup(page);
  const line = page.locator(".pdf-study-text-layer span").filter({ hasText: "Pembilang" }).first();
  const box = (await line.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 12 });
  await expect(page.getByText(/^Dipilih:/)).toBeVisible();
  const selected = await page.evaluate(() => window.getSelection()?.toString());
  expect(selected?.length).toBeGreaterThan(1);
  expect(selected!.length).toBeLessThan((await line.textContent())!.length);
  await page.mouse.up();
  await mock.start();
  const context = await mock.ground("partial-context");
  const block = context.blocks.find((b) => b.text.includes("Pembilang"))!;
  expect((await mock.call("partial-highlight", "present_pdf_guidance", mock.guidance(context, [
    { kind: "highlight", blockId: block.id, quote: "Pembilang" },
  ]))).ok).toBe(true);
  const highlight = page.getByTestId("tutor-highlight");
  await expect(highlight).toBeAttached();
  const length = await highlight.evaluate((path: SVGPathElement) => path.getTotalLength());
  expect(length).toBeLessThan(block.width * 1000 * 0.7);
  expect(mock.errors).toEqual([]);
});

test("a stalled typed response gets one automatic explanation retry", async ({ page }) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain kodomain dan contohnya");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  await page.clock.fastForward(46_000);
  await expect.poll(() => mock.texts.length).toBe(2);
  expect(mock.texts[1]).toBe(mock.texts[0]);
  await expect(page.getByText(/Tutor sedang mencoba menyelesaikan/)).toBeVisible();
  mock.send({ serverContent: { outputTranscription: { text: "Domain adalah daerah asal, kodomain daerah kawan." }, generationComplete: true } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toHaveText("Domain adalah daerah asal, kodomain daerah kawan.");
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="student"]')).toHaveCount(1);
  await page.clock.fastForward(46_000);
  await expect(page.getByText(/Tutor belum menyelesaikan respons/)).toHaveCount(0);
});

test("a direct answer to the domain question needs no extra grounding round trip", async ({ page }) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain kodomain dan contohnya");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  const question = mock.clientMessages.find((message) => message.turnComplete);
  expect(question.turns[0].parts[0].text).toContain("PDF_CONTEXT ");
  expect(question.turns[0].parts.some((part: any) => part.inlineData?.mimeType === "image/jpeg")).toBe(true);
  await page.getByTestId("pdf-scroll-host").evaluate((host) => { host.scrollTop += 100; host.dispatchEvent(new Event("scroll")); });
  await page.clock.runFor(400);
  // A scroll may update React state, but cannot append an unfinished user turn.
  expect(mock.clientMessages.filter((message) => !message.turnComplete)).toHaveLength(0);
  mock.send({ serverContent: { modelTurn: { parts: [{ text: "Contoh f: A → B, A = {1,2} adalah domain dan B = {a,b,c} adalah kodomain." }] }, generationComplete: true } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toContainText("adalah kodomain");
  await page.clock.fastForward(46_000);
  await expect(page.getByText(/Tutor belum menyelesaikan respons/)).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});

test("an idle tool-only response retries immediately instead of waiting for the watchdog", async ({ page }) => {
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain kodomain dan contohnya");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  await mock.call("idle-context", "get_pdf_context");
  mock.send({ serverContent: { turnComplete: true, interactionStatus: "IDLE" } });
  await expect.poll(() => mock.texts.length).toBe(2);
  mock.send({ serverContent: { outputTranscription: { text: "Domain adalah himpunan masukan." }, turnComplete: true, interactionStatus: "IDLE" } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toHaveText("Domain adalah himpunan masukan.");
});


test("the AI moves its cursor and changes captions without replacing annotations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("cursor-context");
  await mock.call("cursor-ink", "present_pdf_guidance", mock.guidance(context));
  const before = await page.getByTestId("tutor-highlight").getAttribute("d");
  const { actions: _actions, ...identity } = mock.guidance(context);
  for (const [index, caption] of ["Ini judulnya", "Sekarang perhatikan pembilang"].entries()) {
    expect((await mock.call(`cursor-${index}`, "move_pdf_cursor", {
      ...identity, blockId: context.blocks[index].id, caption,
    })).ok).toBe(true);
    await expect(page.getByTestId("tutor-cursor-caption")).toHaveText(caption);
    await expect(page.getByTestId("tutor-highlight")).toHaveAttribute("d", before!);
    await expect(page.getByTestId("tutor-highlight")).toHaveAttribute("data-progress", "1");
  }
  await page.getByRole("button", { name: "Hentikan penjelasan" }).click();
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect((await mock.call("cursor-late", "move_pdf_cursor", {
    ...identity, blockId: context.blocks[0].id,
  })).ok).toBe(false);
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  expect(mock.errors).toEqual([]);
});


test("the delayed tail of an answered question cannot finish the next typed question", async ({ page }) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  mock.send({ serverContent: { outputTranscription: { text: "Domain adalah daerah asal." }, generationComplete: true } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toHaveCount(1);
  await composer.fill("Lalu kodomain?");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(2);
  mock.send({ serverContent: { turnComplete: true, interactionStatus: "IDLE" } });
  await page.clock.runFor(300);
  expect(mock.texts).toEqual(["Jelaskan domain", "Lalu kodomain?"]);
  mock.send({ serverContent: { outputTranscription: { text: "Kodomain adalah daerah kawan." }, generationComplete: true } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]')).toHaveCount(2);
});

test("automatic recovery stops after one retry when the provider stays silent", async ({ page }) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain kodomain dan contohnya");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  await page.clock.fastForward(46_000);
  await expect.poll(() => mock.texts.length).toBe(2);
  await page.clock.fastForward(46_000);
  await expect(page.getByText(/Tutor belum menyelesaikan respons/)).toBeVisible();
  expect(mock.texts).toHaveLength(2);
});


test("the next AI cursor tool waits for the duration chosen by the previous step", async ({ page }) => {
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan domain dan kodomain");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  const context = await mock.call("timed-context", "get_pdf_context") as Context;
  const { actions: _actions, ...identity } = mock.guidance(context);
  await mock.call("timed-first", "move_pdf_cursor", {
    ...identity, blockId: context.blocks[0].id, caption: "Baca domain", holdSeconds: 5,
  });
  mock.send({ toolCall: { functionCalls: [{ id: "timed-next", name: "move_pdf_cursor", args: {
    ...identity, blockId: context.blocks[1].id, caption: "Lalu kodomain", holdSeconds: 8,
  } }] } });
  await page.clock.runFor(3_000);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Baca domain");
  expect(mock.responses.has("timed-next")).toBe(false);
  await page.clock.runFor(3_000);
  await expect.poll(() => mock.responses.get("timed-next")?.ok).toBe(true);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Lalu kodomain");
});

test("the pointer closes after the answer and AI reading hold while ink remains", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan pembilang");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  const context = await mock.call("close-context", "get_pdf_context") as Context;
  await mock.call("close-ink", "present_pdf_guidance", mock.guidance(context));
  const { actions: _actions, ...identity } = mock.guidance(context);
  await mock.call("close-cursor", "move_pdf_cursor", {
    ...identity, blockId: context.blocks[1].id, caption: "Baca pembilang", holdSeconds: 5,
  });
  mock.send({ serverContent: {
    outputTranscription: { text: "Pembilang menyatakan bagian yang dipilih." },
    generationComplete: true,
  } });
  await expect(page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="tutor"]'))
    .toContainText("Pembilang menyatakan bagian");
  await page.clock.runFor(4_000);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Baca pembilang");
  await page.clock.runFor(1_500);
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  await expect(page.getByTestId("tutor-highlight")).toHaveCSS("visibility", "visible");
  expect(mock.errors).toEqual([]);
});

test("speech hypotheses update the live question before the final transcript", async ({ page }) => {
  const mock = await setup(page);
  await mock.start();
  const student = page.getByLabel("Transkrip percakapan saat ini").locator('[data-author="student"]');
  mock.send({ serverContent: { interimInputTranscription: { text: "Jelas" } } });
  await expect(student).toHaveText("Jelas");
  mock.send({ serverContent: { interimInputTranscription: { text: "Jelaskan domain" } } });
  await expect(student).toHaveText("Jelaskan domain");
  await expect(student).toHaveCount(1);
  mock.send({ serverContent: { inputTranscription: { text: "Jelaskan domain" } } });
  await expect(student).toHaveText("Jelaskan domain");
  await mock.call("interim-context", "get_pdf_context");
  mock.send({ serverContent: { outputTranscription: { text: "Domain adalah daerah asal." }, generationComplete: true } });
  await expect(student).toHaveText("Jelaskan domain");
  await expect(student).toHaveCount(1);
  expect(mock.errors).toEqual([]);
});

test("planned steps appear as the tutor's words reach them, then the hand drops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan judul dan pembilang");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  const context = await mock.call("say-context", "get_pdf_context") as Context;
  expect((await mock.call("say-ink", "present_pdf_guidance", mock.guidance(context, [
    { kind: "highlight", blockId: context.blocks[0].id, say: "lihat judulnya", caption: "Ini judulnya" },
    { kind: "highlight", blockId: context.blocks[1].id, say: "nah pembilang", caption: "Ini pembilang" },
  ]))).ok).toBe(true);
  const [title, numerator] = [page.getByTestId("tutor-highlight").nth(0), page.getByTestId("tutor-highlight").nth(1)];
  // Planned, not yet said: nothing is pointed at.
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0);
  await expect(title).toHaveCSS("visibility", "hidden");
  mock.send({ serverContent: { outputTranscription: { text: "Coba lihat judulnya dulu. " } } });
  await expect(title).toHaveCSS("visibility", "visible");
  await expect(numerator).toHaveCSS("visibility", "hidden");
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Ini judulnya");
  mock.send({ serverContent: { outputTranscription: { text: "Nah pembilang adalah bagian yang dipilih." } } });
  await expect(numerator).toHaveCSS("visibility", "visible");
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Ini pembilang");
  mock.send({ serverContent: { generationComplete: true, turnComplete: true } });
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0, { timeout: 5_000 });
  await expect(numerator).toHaveCSS("visibility", "visible");
  expect(mock.errors).toEqual([]);
});

test("a spoken step waits until its words are actually heard, not just received", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mock = await setup(page);
  await mock.start();
  const context = await mock.ground("heard-context");
  await mock.call("heard-ink", "present_pdf_guidance", mock.guidance(context, [
    { kind: "highlight", blockId: context.blocks[0].id, say: "lihat judulnya", caption: "Ini judulnya" },
    { kind: "highlight", blockId: context.blocks[1].id, say: "nah pembilang", caption: "Ini pembilang" },
  ]));
  const audio = (seconds: number) => ({
    inlineData: { data: Buffer.alloc(48_000 * seconds).toString("base64"), mimeType: "audio/pcm;rate=24000" },
  });
  const numerator = page.getByTestId("tutor-highlight").nth(1);
  // Both pieces arrive at once; the second one's words are about two seconds into the audio.
  mock.send({ serverContent: { modelTurn: { parts: [audio(1)] }, outputTranscription: { text: "Coba lihat judulnya dulu." } } });
  mock.send({ serverContent: { modelTurn: { parts: [audio(3)] }, outputTranscription: { text: " Sekarang perhatikan, nah pembilang itu bagian yang dipilih." } } });
  await expect(page.getByTestId("tutor-highlight").nth(0)).toHaveCSS("visibility", "visible");
  const sent = Date.now();
  await expect(numerator).toHaveCSS("visibility", "hidden");
  await expect(numerator).toHaveCSS("visibility", "visible", { timeout: 6_000 });
  const waited = Date.now() - sent;
  expect(waited).toBeGreaterThan(1_000);
  expect(waited).toBeLessThan(4_000);
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Ini pembilang");
  expect(mock.errors).toEqual([]);
});

test("with motion the pen rests between spoken steps and finishes once the answer ends", async ({ page }) => {
  const mock = await setup(page);
  const composer = page.getByRole("textbox", { name: "Pesan untuk tutor" });
  await composer.fill("Jelaskan judul dan pembilang");
  await composer.press("Enter");
  await expect.poll(() => mock.texts.length).toBe(1);
  const context = await mock.call("pen-context", "get_pdf_context") as Context;
  await mock.call("pen-ink", "present_pdf_guidance", mock.guidance(context, [
    { kind: "highlight", blockId: context.blocks[0].id, say: "lihat judulnya", caption: "Ini judulnya" },
    { kind: "ellipse", blockId: context.blocks[1].id, say: "nah pembilang", caption: "Ini pembilang" },
  ]));
  const layer = page.getByTestId("pdf-annotation-layer");
  const title = page.getByTestId("tutor-highlight");
  const circle = page.locator('[data-stroke-kind="ellipse"]');
  mock.send({ serverContent: { outputTranscription: { text: "Coba lihat judulnya dulu. " } } });
  await expect(title).toHaveAttribute("data-progress", "1");
  await expect(layer).toHaveAttribute("data-ink-state", "waiting");
  await expect(circle).toHaveCSS("visibility", "hidden");
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Ini judulnya");
  mock.send({ serverContent: { outputTranscription: { text: "Nah pembilang adalah bagian yang dipilih." } } });
  await expect(circle).toHaveAttribute("data-progress", "1");
  await expect(page.getByTestId("tutor-cursor-caption")).toHaveText("Ini pembilang");
  await expect(title).toHaveAttribute("data-progress", "1");
  mock.send({ serverContent: { generationComplete: true, turnComplete: true } });
  await expect(layer).toHaveAttribute("data-ink-state", "complete", { timeout: 5_000 });
  await expect(page.getByTestId("tutor-cursor")).toHaveCount(0, { timeout: 5_000 });
  expect(mock.errors).toEqual([]);
});
