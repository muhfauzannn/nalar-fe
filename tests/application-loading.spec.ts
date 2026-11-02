import { expect, test } from "@playwright/test";
import { PageReadiness } from "../app/features/loading/readiness";
import {
  preparePageAssets,
  waitForImage,
} from "../app/features/loading/page-assets";
import { sceneMatchesRoute } from "../app/features/lms/world3d/store";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

class ImageAsset extends EventTarget {
  src = "/game/coin.webp";
  currentSrc = this.src;
  loading = "eager";
  complete = false;
  naturalWidth = 0;
  decoded = Promise.resolve();
  decode = () => this.decoded;
  getAttribute(name: string) {
    return name === "src" ? this.src : null;
  }
  closest() {
    return null;
  }
  load() {
    this.complete = true;
    this.naturalWidth = 100;
    this.dispatchEvent(new Event("load"));
  }
  fail() {
    this.complete = true;
    this.dispatchEvent(new Event("error"));
  }
}
class Observer {
  static callbacks = new Set<() => void>();
  constructor(private callback: () => void) {}
  observe() {
    Observer.callbacks.add(this.callback);
  }
  disconnect() {
    Observer.callbacks.delete(this.callback);
  }
  static update() {
    [...this.callbacks].forEach((callback) => callback());
  }
}
function page(
  images: ImageAsset[],
  fontJob: Promise<unknown> = Promise.resolve([]),
) {
  let fallback = false;
  let fontLoads = 0;
  const root = {
    querySelector: () => (fallback ? {} : null),
    querySelectorAll: () => images,
    ownerDocument: {
      fonts: {
        load: () => {
          fontLoads++;
          return fontJob;
        },
        ready: Promise.resolve(),
      },
    },
  } as unknown as HTMLElement;
  return {
    root,
    get fontLoads() {
      return fontLoads;
    },
    setFallback: (value: boolean) => {
      fallback = value;
      Observer.update();
    },
  };
}

test.describe.configure({ mode: "serial" });
const previousObserver = Object.getOwnPropertyDescriptor(
  globalThis,
  "MutationObserver",
);
test.beforeAll(() =>
  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    value: Observer,
  }),
);
test.afterAll(() => {
  if (previousObserver)
    Object.defineProperty(globalThis, "MutationObserver", previousObserver);
  else Reflect.deleteProperty(globalThis, "MutationObserver");
});

test("dashboard remains loading until its fonts and decoded image are both ready", async () => {
  const font = deferred<unknown>();
  const decode = deferred();
  const image = new ImageAsset();
  image.decoded = decode.promise;
  const { root } = page([image], font.promise);
  const state = new PageReadiness("dashboard", false);
  const work = preparePageAssets(
    root,
    new AbortController().signal,
    (done, total) => state.progress(done, total),
  ).then(() => state.setResource("assets", true));
  await flush();
  image.load();
  font.resolve([]);
  await flush();
  expect(state.getSnapshot().phase).toBe("assets");
  expect(state.getSnapshot().completed).toBe(4);
  decode.resolve();
  await work;
  expect(state.getSnapshot()).toMatchObject({
    phase: "ready",
    completed: 5,
    total: 5,
  });
});

test("parent shell readiness does not skip the dashboard's delayed clientLoader fallback", async () => {
  const image = new ImageAsset();
  const route = page([image]);
  route.setFallback(true);
  const work = preparePageAssets(
    route.root,
    new AbortController().signal,
    () => {},
  );
  await flush();
  expect(route.fontLoads).toBe(0);
  route.setFallback(false);
  await flush();
  expect(route.fontLoads).toBe(4);
  image.load();
  await work;
  expect(Observer.callbacks.size).toBe(0);
});

test("warm images and fonts finish without a forced minimum duration", async () => {
  const image = new ImageAsset();
  image.load();
  const state = new PageReadiness("cached", false);
  state.start(20);
  await preparePageAssets(
    page([image]).root,
    new AbortController().signal,
    (done, total) => state.progress(done, total),
  );
  state.setResource("assets", true);
  expect(state.getSnapshot().phase).toBe("ready");
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(state.getSnapshot().phase).toBe("ready");
});

test("a broken image rejects instead of reporting the page ready", async () => {
  const image = new ImageAsset();
  const work = preparePageAssets(
    page([image]).root,
    new AbortController().signal,
    () => {},
  );
  await flush();
  image.fail();
  await expect(work).rejects.toThrow("Image failed");
});

test("a font failure is observable even when every image is cached", async () => {
  const fonts = deferred<unknown>();
  const work = preparePageAssets(
    page([], fonts.promise).root,
    new AbortController().signal,
    () => {},
  );
  await flush();
  fonts.reject(new Error("Font download failed"));
  await expect(work).rejects.toThrow("Font download failed");
});

test("lazy decorations are excluded from the required asset set", async () => {
  const image = new ImageAsset();
  image.loading = "lazy";
  const updates: number[] = [];
  await preparePageAssets(
    page([image]).root,
    new AbortController().signal,
    (done) => updates.push(done),
  );
  expect(updates.at(-1)).toBe(4);
  expect(image.complete).toBe(false);
});

test("navigation aborts old image waits without changing the destination's session", async () => {
  const old = new PageReadiness("old", false);
  const current = new PageReadiness("new", false);
  const image = new ImageAsset();
  const abort = new AbortController();
  const work = waitForImage(image as unknown as HTMLImageElement, abort.signal);
  abort.abort();
  await expect(work).rejects.toMatchObject({ name: "AbortError" });
  old.setResource("assets", true);
  image.load();
  expect(current.getSnapshot().phase).toBe("assets");
});

test("leaving a nested hydration fallback disconnects its observer", async () => {
  const route = page([]);
  route.setFallback(true);
  const abort = new AbortController();
  const work = preparePageAssets(route.root, abort.signal, () => {});
  abort.abort();
  await expect(work).rejects.toMatchObject({ name: "AbortError" });
  expect(Observer.callbacks.size).toBe(0);
});

test("the classroom waits for the model frame and late-mounted images", async () => {
  const state = new PageReadiness("classroom", true);
  const lateImages = deferred();
  state.afterScene = () => lateImages.promise;
  state.setResource("assets", true);
  expect(state.getSnapshot().phase).toBe("scene");
  state.sceneRendered();
  await flush();
  expect(state.getSnapshot().phase).toBe("scene");
  lateImages.resolve();
  await flush();
  expect(state.getSnapshot().phase).toBe("ready");
});

test("background model prefetch does not block an already usable page", () => {
  const state = new PageReadiness("island", true);
  state.setResource("assets", true);
  state.setResource("scene", true);
  state.setSceneLoading(true);
  expect(state.getSnapshot()).toMatchObject({
    phase: "ready",
    sceneLoading: true,
  });
});

test("a required PDF keeps the page pending until its first page renders", () => {
  const state = new PageReadiness("lesson", false);
  state.setResource("pdf:resource-a", false);
  state.setResource("assets", true);
  expect(state.getSnapshot().phase).toBe("resource");
  state.setResource("pdf:resource-a", true);
  expect(state.getSnapshot().phase).toBe("ready");
});

test("unmounting optional activity content releases its outstanding readiness check", () => {
  const state = new PageReadiness("lesson", false);
  state.setResource("pdf:resource-a", false);
  state.setResource("assets", true);
  state.removeResource("pdf:resource-a");
  expect(state.getSnapshot().phase).toBe("ready");
});

test("a stalled load becomes a retry state and late work cannot hide the failure", async () => {
  const state = new PageReadiness("stalled", true);
  state.start(1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(state.getSnapshot().phase).toBe("error");
  state.setResource("assets", true);
  state.setResource("scene", true);
  expect(state.getSnapshot().phase).toBe("error");
});

test("a later required resource also has a deadline", async () => {
  const state = new PageReadiness("lesson", false);
  state.start(1);
  state.setResource("assets", true);
  state.setResource("pdf:late", false);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(state.getSnapshot().phase).toBe("error");
});

test("a missing island place can fall back without making the loader wait forever", () => {
  expect(
    sceneMatchesRoute(
      { kind: "island", courseId: "a" },
      { kind: "place", courseId: "a", place: "arena" },
    ),
  ).toBe(true);
  expect(
    sceneMatchesRoute(
      { kind: "classroom", courseId: "a", focus: null },
      { kind: "classroom", courseId: "b", focus: null },
    ),
  ).toBe(false);
  expect(
    sceneMatchesRoute(
      { kind: "classroom", courseId: "a", focus: "lab" },
      { kind: "classroom", courseId: "a", focus: "papan" },
    ),
  ).toBe(false);
});
