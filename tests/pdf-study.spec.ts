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
  const appendedBytes: number[] = [];
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    ws.onMessage((raw) => {
      const data = JSON.parse(raw.toString());
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
      for (const item of data.clientContent?.turns ?? []) {
        const text = item.parts?.[0]?.text;
        if (text?.startsWith("PDF_VIEW_STATE "))
          view = JSON.parse(text.slice(15));
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
      for (const response of data.toolResponse?.functionResponses ?? [])
        responses.set(response.id, response.response);
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
    start,
    ground,
    call,
    send,
    guidance,
    responses,
    getView: () => view,
    getImages: () => images,
    appendedBytes,
  };
}

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
  await expect(page.getByTestId("tutor-highlight")).toBeVisible();
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
  await expect.poll(() => mock.getView()?.page).toBe(2);
  mock.send({ serverContent: { interrupted: true } });
  await mock.ground("read-4");
  expect(mock.getImages()).toBe(3);
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
  // The new page reaches the tutor, and the answer keeps playing.
  await expect.poll(() => mock.getView()?.page).toBe(2);

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
  await expect(page.getByTestId("tutor-highlight")).toBeVisible();
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
  await expect(page.getByTestId("tutor-highlight")).toBeVisible();
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
  await expect(page.getByTestId("tutor-highlight")).toBeVisible();
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
