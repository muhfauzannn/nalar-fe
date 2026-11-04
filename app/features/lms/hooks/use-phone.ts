import { useSyncExternalStore } from "react";

const PHONE = "(max-width: 639px)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(PHONE);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** True on a phone-width screen, where the world's panels come up from the bottom as sheets. */
export function usePhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);
}
