import { useCallback, useLayoutEffect, useRef, type CSSProperties } from "react";

const MAX_STAGGER = 6;

// Items that enter together cascade by ~35ms each (see `.enter-up`). The cap keeps
// a long list from making the last row wait.
export function stagger(index: number): CSSProperties {
  return { "--i": Math.min(index, MAX_STAGGER) } as CSSProperties;
}

// While a reorder is being saved, show the order the user asked for instead of
// waiting for the round trip. If the server refuses, `formData` goes away and the
// list falls back to the saved order (with the error shown next to it).
export function optimisticOrder<T extends { id: string }>(
  items: T[],
  formData: FormData | undefined,
): T[] {
  const raw = formData?.get("ids");
  if (typeof raw !== "string") return items;
  try {
    const ids = JSON.parse(raw) as string[];
    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
    return ordered.length === items.length ? ordered : items;
  } catch {
    return items;
  }
}

const FLIP_DURATION = 240;
// Same curve as --ease-out-strong; WAAPI needs the literal value.
const FLIP_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";
// A captured snapshot is only good for the render it was captured for.
const SNAPSHOT_TTL = 1_500;

// FLIP: slide keyed children (`data-flip-key`) from where they were to where they
// now are, instead of letting a reorder jump. Call `capture()` right before
// asking for the change; the next render that actually moves something animates
// from that snapshot. Taking the snapshot at the moment of the click (rather than
// comparing renders) means a row that grew or an unrelated re-render never looks
// like a reorder. Transform only, so it runs on the compositor; skipped when the
// user asked for reduced motion.
export function useFlip<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const snapshot = useRef<Map<string, number> | null>(null);
  const expiry = useRef<number | undefined>(undefined);

  const measure = useCallback(() => {
    const container = ref.current;
    const tops = new Map<string, number>();
    if (!container) return tops;
    // Relative to the container, so scrolling does not read as movement.
    const base = container.getBoundingClientRect().top;
    for (const element of container.querySelectorAll<HTMLElement>(":scope > [data-flip-key]")) {
      const key = element.dataset.flipKey;
      if (key) tops.set(key, element.getBoundingClientRect().top - base);
    }
    return tops;
  }, []);

  const capture = useCallback(() => {
    snapshot.current = measure();
    window.clearTimeout(expiry.current);
    expiry.current = window.setTimeout(() => {
      snapshot.current = null;
    }, SNAPSHOT_TTL);
  }, [measure]);

  useLayoutEffect(() => {
    const before = snapshot.current;
    const container = ref.current;
    if (!before || !container) return;
    const after = measure();
    let moved = false;
    for (const element of container.querySelectorAll<HTMLElement>(":scope > [data-flip-key]")) {
      const key = element.dataset.flipKey;
      const from = key ? before.get(key) : undefined;
      const to = key ? after.get(key) : undefined;
      if (from === undefined || to === undefined || Math.abs(from - to) < 1) continue;
      moved = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) continue;
      element.animate(
        [{ transform: `translateY(${from - to}px)` }, { transform: "translateY(0)" }],
        { duration: FLIP_DURATION, easing: FLIP_EASING },
      );
    }
    // Keep waiting if this render did not move anything yet (the optimistic
    // order may land one render after the click).
    if (moved) snapshot.current = null;
  });

  return { ref, capture };
}
