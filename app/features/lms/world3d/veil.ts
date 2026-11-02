// A light veil over the canvas for cutting between the world and the classroom:
// the world camera dives at the door, the veil closes, the scene swaps under it
// and opens on the room. The stage registers the element.

let element: HTMLElement | null = null;

export function registerVeil(next: HTMLElement | null) {
  element = next;
}

/** Fades the veil to `opacity` and resolves when it is there. */
export function fadeVeil(opacity: number, ms: number) {
  if (!element || ms <= 0) {
    if (element) element.style.opacity = String(opacity);
    return Promise.resolve();
  }
  const from = getComputedStyle(element).opacity;
  const animation = element.animate([{ opacity: from }, { opacity }], { duration: ms, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
  return animation.finished.then(() => {
    if (element) element.style.opacity = String(opacity);
    animation.cancel();
  });
}
