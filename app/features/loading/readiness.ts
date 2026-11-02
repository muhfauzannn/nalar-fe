export type LoadPhase = "assets" | "scene" | "resource" | "ready" | "error";
export type LoadSnapshot = { phase: LoadPhase; completed: number; total: number; error: string | null; sceneLoading: boolean };

/** One readiness contract per committed route. Late work cannot finish another route. */
export class PageReadiness {
  private resources = new Map<string, boolean>();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private timeoutMs = 30_000;
  private snapshot: LoadSnapshot = { phase: "assets", completed: 0, total: 0, error: null, sceneLoading: false };
  afterScene: (() => Promise<void>) | undefined;
  private sceneAcknowledged = false;
  constructor(readonly key: string, scene: boolean) {
    this.resources.set("assets", false);
    if (scene) this.resources.set("scene", false);
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  start(timeoutMs = 30_000) {
    this.timeoutMs = timeoutMs;
    this.dispose();
    if (this.snapshot.phase !== "ready" && this.snapshot.phase !== "error") this.timer = setTimeout(() => this.fail("Pemuatan terlalu lama. Periksa koneksi lalu coba lagi."), timeoutMs);
  }
  dispose() { clearTimeout(this.timer); }
  setSceneLoading(sceneLoading: boolean) { this.publish({ ...this.snapshot, sceneLoading }); }
  sceneRendered() {
    if (this.sceneAcknowledged || !this.resources.has("scene")) return;
    this.sceneAcknowledged = true;
    void Promise.resolve().then(() => this.afterScene?.()).then(
      () => this.setResource("scene", true),
      (error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) this.fail("Ada aset ruangan yang belum dapat dimuat. Silakan coba lagi."); },
    );
  }
  progress(completed: number, total: number) {
    if (this.snapshot.phase === "error") return;
    this.publish({ ...this.snapshot, completed, total });
  }
  setResource(name: string, ready: boolean) {
    if (this.snapshot.phase === "error" || this.resources.get(name) === ready) return;
    this.resources.set(name, ready);
    this.recompute();
  }
  removeResource(name: string) {
    if (name === "assets" || name === "scene" || !this.resources.has(name) || this.snapshot.phase === "error") return;
    this.resources.delete(name);
    this.recompute();
  }
  fail(message: string) {
    if (this.snapshot.phase === "error") return;
    this.dispose();
    this.publish({ ...this.snapshot, phase: "error", error: message });
  }
  private recompute() {
    const wasReady = this.snapshot.phase === "ready";
    const phase: LoadPhase = !this.resources.get("assets") ? "assets" : this.resources.get("scene") === false ? "scene" : [...this.resources.values()].some((value) => !value) ? "resource" : "ready";
    this.publish({ ...this.snapshot, phase });
    if (phase === "ready") this.dispose();
    else if (wasReady) this.start(this.timeoutMs);
  }
  private publish(next: LoadSnapshot) {
    if (JSON.stringify(next) === JSON.stringify(this.snapshot)) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
