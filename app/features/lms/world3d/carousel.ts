import { useSyncExternalStore, useRef, useEffect, type PointerEvent, type MouseEvent } from "react";

let selected = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function carouselIndex(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}
export function moveWorldCarousel(direction: -1 | 1, count: number) {
  if (count < 2) return;
  const next = carouselIndex(selected + direction, count);
  if (next === selected) return;
  selected = next;
  listeners.forEach((listener) => listener());
}
export function useWorldCarousel(count: number) {
  const index = useSyncExternalStore(subscribe, () => selected, () => 0);
  return carouselIndex(index, count);
}

/** Ignore taps and mostly vertical movement so a swipe cannot open a course. */
export function worldSwipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  return Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx < 0 ? 1 : -1) : 0;
}
export function useWorldSwipe(enabled: boolean, count: number) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return {
    onPointerDownCapture(event: PointerEvent<HTMLElement>) {
      if (!enabled || count < 2 || event.button !== 0 || !event.isPrimary || (window.innerWidth >= 768 && !window.matchMedia("(pointer: coarse)").matches)) return;
      if (timer.current) clearTimeout(timer.current);
      suppress.current = false;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    },
    onPointerUpCapture(event: PointerEvent<HTMLElement>) {
      const point = start.current;
      start.current = null;
      if (!enabled || !point || point.id !== event.pointerId) return;
      const direction = worldSwipeDirection(event.clientX - point.x, event.clientY - point.y);
      if (!direction) return;
      suppress.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { suppress.current = false; }, 400);
      moveWorldCarousel(direction, count);
    },
    onPointerCancelCapture() { start.current = null; },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!suppress.current) return;
      suppress.current = false;
      event.preventDefault(); event.stopPropagation();
    },
  };
}
