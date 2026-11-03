import { createContext, useContext, useEffect, type ReactNode } from "react";

import type { AiTutorTarget } from "../types";

// In the classroom the AI tutor is a spirit that floats in the room, not a
// panel inside each activity. An activity that would show its own tutor panel
// registers what the tutor should look at with the host instead, and hides its
// panel. Outside the classroom there is no host, and activities keep their panel.

export type TutorSource = {
  /** Changes when the tutor needs a new conversation (another lab, question or submission). */
  key: string;
  /** Shown to the student: what the tutor is looking at. */
  label: string;
  target: AiTutorTarget;
  /** What is on the screen right now, sent to the tutor as background. */
  liveContext?: string;
};

type Host = { setSource: (source: TutorSource | null) => void };

const HostContext = createContext<Host | null>(null);

export function TutorHostProvider({ host, children }: { host: Host; children: ReactNode }) {
  return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
}

/** Hands `source` to the classroom's tutor while mounted. True when hosted, so the caller hides its own panel. */
export function useHostedTutor(source: TutorSource | null) {
  const host = useContext(HostContext);
  const signature = source ? `${source.key}\n${source.label}\n${source.liveContext ?? ""}` : "";
  useEffect(() => {
    if (!host) return;
    host.setSource(source);
    return () => host.setSource(null);
    // `signature` covers every field of `source` the host reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, signature]);
  return Boolean(host);
}
