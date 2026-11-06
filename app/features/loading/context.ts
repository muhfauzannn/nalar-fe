import {
  createContext,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import type { PageReadiness } from "./readiness";

export const PageReadinessContext = createContext<PageReadiness | null>(null);
export const usePageReadiness = () => useContext(PageReadinessContext);

const subscribeWithoutPage = () => () => {};
/** Defer welcome/reward effects until the page is actually visible. */
export function usePageReady() {
  const session = usePageReadiness();
  const ready = () => !session || session.getSnapshot().phase === "ready";
  return useSyncExternalStore(
    session?.subscribe ?? subscribeWithoutPage,
    ready,
    ready,
  );
}

/** For content which must finish its own asynchronous work, such as a PDF. */
export function useRequiredPageAsset(
  name: string,
  ready: boolean,
  failure?: string | null,
  enabled = true,
) {
  const session = usePageReadiness();
  useLayoutEffect(() => {
    if (!enabled) return;
    if (failure) session?.fail(failure);
    else session?.setResource(name, ready);
    return () => session?.removeResource(name);
  }, [session, name, ready, failure, enabled]);
}
