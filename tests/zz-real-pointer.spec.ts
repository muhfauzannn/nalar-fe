import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { studyPdf } from "./fixtures/pdf";
const headers = { "access-control-allow-origin": "http://127.0.0.1:4174", "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type" };
const S = "/private/tmp/claude-501/-Users-muhammadfauzan--claude-spares-spare-3HiNEb/8ddc9c04-9d83-4cd3-8165-a89d21b89580/scratchpad/probe";
test("real gemini on the 3D board", async ({ page }) => {
  test.setTimeout(240_000);
  const events: string[] = [];
  await page.route("**/api/student/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (request.url().includes("/file")) return route.fulfill({ body: studyPdf(), contentType: "application/pdf", headers });
    if (request.url().includes("session-events")) { events.push(JSON.stringify(request.postDataJSON())); return route.fulfill({ status: 204, headers }); }
    const minted = JSON.parse(execFileSync(S + "/mint.sh", { encoding: "utf8" }));
    return route.fulfill({ json: { ...minted, resourceId: request.postDataJSON().resourceId, expiresAt: new Date(Date.now() + 600_000).toISOString() }, headers });
  });
  const t0 = Date.now();
  page.on("websocket", (ws) => {
    ws.on("framesent", (f) => { const t = String(f.payload); if (t.includes("clientContent")) console.log("#", Date.now() - t0, "SENT question"); if (t.includes("toolResponse")) console.log("#", Date.now() - t0, "SENT toolResponse", t.slice(0, 160)); });
    ws.on("framereceived", (f) => { try { const m = JSON.parse(String(f.payload)); const c = m.serverContent ?? {}; const k = [m.toolCall && "toolCall:" + m.toolCall.functionCalls?.map((x: any) => x.name), m.toolCallCancellation && "CANCEL", c.interrupted && "INTERRUPTED", c.generationComplete && "genComplete", c.turnComplete && "turnComplete:" + (c.turnCompleteReason ?? ""), c.outputTranscription?.text && "tx", c.modelTurn && "audio"].filter(Boolean); if (k.some((x: string) => x !== "tx" && x !== "audio")) console.log("#", Date.now() - t0, k.join(" ")); } catch {} });
  });
  await page.goto("/tests/fixtures/classroom.html?station=papan&pdf=1");
  await expect(page.locator(".pdf-study-text-layer")).toContainText("Pembilang", { timeout: 30_000 });
  await page.getByRole("button", { name: "Panggil tutor" }).click();
  const bubble = page.getByRole("region", { name: "Tutor AI" });
  await expect(bubble).toBeVisible();
  const composer = bubble.getByRole("textbox", { name: "Pesan untuk tutor" });
  const thread = bubble.getByLabel("Transkrip percakapan saat ini");
  const questions = ["aku ga ngerti pembilang itu apa", "maksudnya gimana?", "kasih contoh lain dong", "terus bagian bawah halaman ini ngomongin apa?"];
  let index = 0;
  for (const question of questions) {
    index++;
    await expect(composer).toBeEnabled({ timeout: 30_000 });
    await composer.fill(question);
    await composer.press("Enter");
    let sawPointer = false; let sawInk = false; let shot = false;
    const before = await thread.locator('[data-author="tutor"]').count();
    const started = Date.now();
    while (Date.now() - started < 40_000) {
      const state = await page.evaluate(() => {
        const pointer = document.querySelector("[data-tutor-pointer]");
        const overlay = document.querySelector("[data-testid=pdf-annotation-layer]") as HTMLElement | null;
        const host = document.querySelector("[data-testid=pdf-scroll-host]");
        const box = pointer?.getBoundingClientRect(); const view = host?.getBoundingClientRect();
        return { pointer: !!pointer && getComputedStyle(pointer).visibility !== "hidden", onScreen: !!box && !!view && box.top >= view.top && box.bottom <= view.bottom, ink: overlay?.dataset.inkState, scroll: host?.scrollTop };
      });
      sawPointer ||= state.pointer && state.onScreen;
      sawInk ||= state.ink === "drawing" || state.ink === "waiting" || state.ink === "complete";
      if (sawPointer && !shot) { await page.waitForTimeout(1200); await page.screenshot({ path: S + "/board-" + index + ".png" }); shot = true; }
      if ((await thread.locator('[data-author="tutor"]').count()) > before && Date.now() - started > Number(process.env.GAP ?? 6000)) break;
      await page.waitForTimeout(150);
    }
    const answer = await thread.locator('[data-author="tutor"]').last().textContent();
    console.log(JSON.stringify({ question, sawPointer, sawInk, ms: Date.now() - started, answer: answer?.slice(0, 110) }));
    await page.waitForTimeout(Number(process.env.PAUSE ?? 0));
  }
  const all = await thread.textContent();
  console.log(JSON.stringify({ apology: /maaf|tidak bisa muncul/i.test(all ?? ""), events }));
});
