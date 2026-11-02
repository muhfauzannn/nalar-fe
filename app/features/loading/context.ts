import { createContext, useContext, useLayoutEffect } from "react";
import type { PageReadiness } from "./readiness";

export const PageReadinessContext = createContext<PageReadiness | null>(null);
export const usePageReadiness = () => useContext(PageReadinessContext);

/** For content which must finish its own asynchronous work, such as a PDF. */
export function useRequiredPageAsset(name: string, ready: boolean, failed = false) {
  const session = usePageReadiness();
  useLayoutEffect(() => {
    if (failed) session?.fail("Ada bagian halaman yang belum dapat dimuat. Silakan coba lagi.");
    else session?.setResource(name, ready);
    return () => session?.removeResource(name);
  }, [session, name, ready, failed]);
}
