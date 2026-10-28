import { useEffect, useRef } from "react";

/**
 * How long a Live session that only serves typed questions may sit unused. Every open session
 * counts against Google's ~6 concurrent sessions per API key; reopening one on the next question
 * costs about a second (and one of the account's 30 sessions per 10 minutes).
 */
export const TEXT_IDLE_CLOSE_MS = 60_000;

/** Calls `close` once `armed` has stayed true for `ms`. Any change of `armed` restarts the wait. */
export function useIdleClose(armed: boolean, close: () => void, ms = TEXT_IDLE_CLOSE_MS) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => closeRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [armed, ms]);
}
