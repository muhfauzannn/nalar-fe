import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";

// The classroom's lab bench (fixtures/classroom.html?station=lab&lab=<key>) with the tutor
// spirit talking to it. Gemini Live is replaced by a socket the test drives; what the
// tutor sends is exactly what the server's tool declaration allows (lab-tutor.config.ts).

const headers = {
  "access-control-allow-origin": "http://127.0.0.1:4174",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
};

async function openLab(page: Page, lab = "mesin-gelombang") {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let classified = 0;
  await page.route("**/api/student/ai-tutor/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = route.request().url();
    if (url.endsWith("/sessions"))
      return route.fulfill({
        headers,
        json: {
          conversationId: "conversation-lab",
          token: "auth_tokens/test",
          model: "gemini-3.8-live",
          messages: [],
          mode: "hint",
          questionId: null,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      });
    if (url.endsWith("/classifications"))
      return route.fulfill({
        headers,
        json: {
          messageId: `student-${++classified}`,
          intent: "explanation_hint",
          confidence: 0.8,
          isFallback: false,
          wasRedirected: false,
          responseInstruction: "Beri satu petunjuk bertahap.",
        },
      });
    if (url.endsWith("/replies")) return route.fulfill({ headers, json: { saved: true, messageId: "reply" } });
    return route.fulfill({ headers, json: {} });
  });

  let socket: WebSocketRoute | undefined;
  const sent: any[] = [];
  const responses = new Map<string, Record<string, any>>();
  await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws) => {
    socket = ws;
    ws.onMessage((raw) => {
      const data = JSON.parse(raw.toString());
      sent.push(data);
      if (data.setup) ws.send(JSON.stringify({ setupComplete: {} }));
      for (const response of data.toolResponse?.functionResponses ?? []) responses.set(response.id, response.response);
    });
  });

  await page.goto(`/tests/fixtures/classroom.html?station=lab&lab=${lab}`);

  const emit = (event: unknown) => {
    if (!socket) throw new Error("No socket");
    socket.send(JSON.stringify(event));
  };
  const call = async (id: string, name: string, args: unknown) => {
    emit({ toolCall: { functionCalls: [{ id, name, args }] } });
    await expect.poll(() => responses.has(id)).toBe(true);
    return responses.get(id)!;
  };
  const bubble = page.getByRole("region", { name: "Tutor AI" });
  const ring = page.getByTestId("lab-pointer");
  let turns = 0;
  /** The student types a question, and it reaches the tutor. */
  const type = async (question: string) => {
    const composer = bubble.getByRole("textbox", { name: "Pesan untuk tutor" });
    await composer.fill(question);
    await composer.press("Enter");
    await expect.poll(() => sent.some((event) => event.realtimeInput?.text === question)).toBe(true);
  };
  /** The tutor classifies the question (the server's guard), then plans its pointing. */
  const ask = async (question: string, steps?: unknown[]) => {
    const turn = ++turns;
    await type(question);
    await call(`classify-${turn}`, "classify_student_prompt", { content: question });
    return steps ? call(`point-${turn}`, "point_at_lab_part", { steps }) : null;
  };
  const say = (text: string) => emit({ serverContent: { outputTranscription: { text } } });
  const summon = async () => {
    await expect(page.locator("[data-lab-part]").first()).toBeAttached({ timeout: 30_000 });
    await page.getByRole("button", { name: "Panggil tutor" }).click();
    await expect(bubble).toBeVisible();
  };
  return { errors, emit, call, say, type, ask, summon, bubble, ring, sent };
}

const steps = [
  { part: "engkol", say: "Putar engkol", caption: "Engkol" },
  { part: "pasak", say: "Lalu pasak", caption: "Pasak" },
];

test.beforeEach(({}, info) => info.setTimeout(60_000));

test("the tutor points at each part as the words that name it are heard", async ({ page }) => {
  const lab = await openLab(page);
  await lab.summon();
  const planned = await lab.ask("Gimana cara menggambar gelombang?", steps);
  expect(planned!.ok).toBe(true);
  // Planned, but nothing is said yet: nothing is pointed at yet.
  await expect(lab.ring).toHaveCount(0);

  lab.say("Putar engkol pelan-pelan dulu.");
  await expect(lab.ring).toHaveAttribute("data-part", "engkol");
  await expect(page.getByTestId("lab-pointer-caption")).toHaveText("NALAR · Engkol");
  // The ring is drawn around the real part: it has a size and sits inside the lab card.
  const box = await lab.ring.boundingBox();
  expect(box!.width).toBeGreaterThan(10);
  expect(box!.height).toBeGreaterThan(10);

  lab.say(" Lalu pasak di rodanya, geser sedikit.");
  await expect(lab.ring).toHaveAttribute("data-part", "pasak");
  await expect(page.getByTestId("lab-pointer-caption")).toHaveText("NALAR · Pasak");

  lab.emit({ serverContent: { turnComplete: true } });
  await expect(lab.bubble.locator('[data-author="tutor"]')).toContainText("Putar engkol pelan-pelan dulu.");
  expect(lab.errors).toEqual([]);
});

test("a part the lab does not have, or a plan before the question is checked, shows nothing and says why", async ({ page }) => {
  const lab = await openLab(page);
  await lab.summon();

  // The tutor must classify the student's question first: pointing before that is refused.
  await lab.type("Apa itu amplitudo?");
  const early = await lab.call("early", "point_at_lab_part", { steps });
  expect(early.ok).toBe(false);
  expect(early.error).toContain("classify_student_prompt");
  // This failure is to be fixed, not worked around: the tutor is told to check first, then point.
  expect(early.responseInstruction).toContain("classify_student_prompt");
  expect(early.continueWithExplanation).toBeUndefined();

  await lab.call("classify", "classify_student_prompt", { content: "Apa itu amplitudo?" });
  const wrong = await lab.call("wrong", "point_at_lab_part", { steps: [{ part: "roket", say: "Lihat roket", caption: "Roket" }] });
  expect(wrong.ok).toBe(false);
  expect(wrong.error).toContain("engkol");
  expect(wrong.responseInstruction).toContain("jangan ulangi");
  lab.say("Lihat roket itu.");
  await expect(lab.ring).toHaveCount(0);
  expect(lab.errors).toEqual([]);
});

test("a new question takes the pointer away before the next answer", async ({ page }) => {
  const lab = await openLab(page);
  await lab.summon();
  await lab.ask("Gimana cara menggambar gelombang?", steps);
  lab.say("Putar engkol pelan-pelan dulu.");
  await expect(lab.ring).toHaveAttribute("data-part", "engkol");
  lab.emit({ serverContent: { turnComplete: true } });
  await expect(lab.bubble.locator('[data-author="tutor"]')).toHaveCount(1);

  await lab.ask("Terus gimana?");
  await expect(lab.ring).toHaveCount(0);
  expect(lab.errors).toEqual([]);
});

test("the pointer stays a moment after the answer, then goes", async ({ page }) => {
  await page.clock.install();
  const lab = await openLab(page);
  await lab.summon();
  await lab.ask("Gimana cara menggambar gelombang?", steps);
  lab.say("Putar engkol pelan-pelan dulu.");
  await expect(lab.ring).toHaveAttribute("data-part", "engkol");
  lab.emit({ serverContent: { turnComplete: true } });
  await expect(lab.bubble.locator('[data-author="tutor"]')).toHaveCount(1);

  await page.clock.fastForward(1_000);
  await expect(lab.ring).toHaveAttribute("data-part", "pasak");
  await page.clock.fastForward(6_000);
  await expect(lab.ring).toHaveCount(0);
  expect(lab.errors).toEqual([]);
});

test("closing the tutor takes the pointer away", async ({ page }) => {
  const lab = await openLab(page);
  await lab.summon();
  await lab.ask("Gimana cara menggambar gelombang?", steps);
  lab.say("Putar engkol pelan-pelan dulu.");
  await expect(lab.ring).toHaveAttribute("data-part", "engkol");
  await lab.bubble.getByRole("button", { name: "Tutup tutor" }).click();
  await expect(lab.ring).toHaveCount(0);
});

for (const key of ["gerak-parabola", "mesin-gelombang", "reaktor-tumbukan", "mikroskop-osmosis"]) {
  test(`${key}: every part its tutor may point at is on the bench, and the server briefs the same parts`, async ({ page }) => {
    await page.goto(`/tests/fixtures/classroom.html?station=lab&lab=${key}`);
    await expect(page.locator("[data-lab-part]").first()).toBeAttached({ timeout: 30_000 });
    const found = await page.evaluate(async (labKey) => {
      const modulePath = "/app/features/labs/registry.ts";
      const { LABS } = await import(/* @vite-ignore */ modulePath);
      const parts: string[] = LABS[labKey].parts;
      return {
        parts,
        missing: parts.filter((part) => document.querySelectorAll(`[data-lab-part="${part}"]`).length !== 1),
        marked: [...document.querySelectorAll("[data-lab-part]")].map((element) => element.getAttribute("data-lab-part")!),
      };
    }, key);
    // Each part is marked exactly once, and nothing is marked that the tutor cannot name.
    expect(found.missing).toEqual([]);
    expect([...found.marked].sort()).toEqual([...found.parts].sort());

    // The backend sources sit beside this app in the repository; elsewhere this check is skipped.
    const backend = await import("../../nalar-be/src/modules/ai-tutor/lab-tutor.config").catch(() => null);
    test.skip(!backend, "nalar-be is not next to nalar-fe");
    const briefs = backend!.LAB_TUTOR_BRIEFS as Record<string, { parts: Record<string, string> }>;
    expect(Object.keys(briefs[key]!.parts).sort()).toEqual([...found.parts].sort());
  });
}
