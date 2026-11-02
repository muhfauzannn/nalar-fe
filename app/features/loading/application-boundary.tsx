import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useLocation, useNavigation } from "react-router";
import { isWorldPath, useWorld3d } from "../lms/world3d/mode";
import { ApplicationLoader } from "./application-loader";
import { PageReadinessContext, usePageReadiness } from "./context";
import { preparePageAssets } from "./page-assets";
import { PageReadiness } from "./readiness";

function useDelayedLoading(busy: boolean) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!busy) {
      setShown(false);
      return;
    }
    const id = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(id);
  }, [busy]);
  return busy && shown;
}

export function ApplicationLoadingBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const navigation = useNavigation();
  const world3d = useWorld3d();
  const expectsScene = world3d && isWorldPath(location.pathname);
  const session = useMemo(
    () => new PageReadiness(location.key, expectsScene),
    [location.key, expectsScene],
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const content = useRef<HTMLDivElement>(null);
  const [hasShownPage, setHasShownPage] = useState(false);
  const moving =
    navigation.state === "loading" &&
    (!navigation.formMethod || navigation.formMethod.toLowerCase() === "get") &&
    !!navigation.location &&
    (navigation.location.pathname !== location.pathname ||
      navigation.location.search !== location.search);
  const busy = moving || state.phase !== "ready";
  const delayed = useDelayedLoading(busy);
  // A warm 3D transition may be waiting only for its camera/veil. Keep that
  // transition visible; show the loader when models really are downloading.
  const blocking = moving || state.phase !== "scene" || state.sceneLoading;
  const showLoader =
    state.phase === "error" ||
    (busy && (!hasShownPage || (delayed && blocking)));
  useLayoutEffect(() => {
    if (!content.current) return;
    const abort = new AbortController();
    session.start();
    const root = content.current;
    session.afterScene = () =>
      preparePageAssets(root, abort.signal, (done, total) =>
        session.progress(done, total),
      );
    void preparePageAssets(content.current, abort.signal, (done, total) =>
      session.progress(done, total),
    ).then(
      () => {
        if (!abort.signal.aborted) session.setResource("assets", true);
      },
      (error: unknown) => {
        if (abort.signal.aborted) return;
        console.error("[loading] Page assets failed", error);
        session.fail(
          "Ada aset halaman yang belum dapat dimuat. Periksa koneksi lalu coba lagi.",
        );
      },
    );
    return () => {
      abort.abort();
      session.dispose();
    };
  }, [session]);
  useEffect(() => {
    if (state.phase === "ready") setHasShownPage(true);
  }, [state.phase]);
  return (
    <PageReadinessContext.Provider value={session}>
      <div
        ref={content}
        className="contents"
        inert={showLoader}
        aria-hidden={showLoader || undefined}
        aria-busy={busy}
        data-page-readiness={state.phase}
      >
        {children}
      </div>
      {showLoader && (
        <ApplicationLoader
          pathname={navigation.location?.pathname ?? location.pathname}
          state={moving ? undefined : state}
        />
      )}
    </PageReadinessContext.Provider>
  );
}

class SceneFailureBoundary extends Component<
  { session: PageReadiness | null; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[loading] 3D assets failed", error, info.componentStack);
    this.props.session?.fail(
      "Ruangan belum dapat dimuat. Periksa koneksi lalu coba lagi.",
    );
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function SceneAssetBoundary({ children }: { children: ReactNode }) {
  const session = usePageReadiness();
  return (
    <SceneFailureBoundary session={session}>{children}</SceneFailureBoundary>
  );
}
