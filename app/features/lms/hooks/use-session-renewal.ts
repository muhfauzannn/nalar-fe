import { useCallback, useEffect, useRef } from "react";
import { renewalPlan } from "../lib/live-session-policy";

const RETRY_MS = 8_000;

/**
 * Google ends every Live connection after 10 minutes, mid-sentence and without warning. A little
 * before that this opens a second session and hands the conversation over (make-before-break), so
 * the student never sees a break. `renew(deadlineAt)` does the swap and reports whether it worked;
 * a failed attempt (no capacity right now, network) is retried until the deadline, after which the
 * ordinary "session ended" recovery takes over.
 */
export function useSessionRenewal(
  renew: (deadlineAt: number) => Promise<boolean>,
  maxSessionMs: () => number,
) {
  const renewRef = useRef(renew);
  const maxRef = useRef(maxSessionMs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epoch = useRef(0);

  useEffect(() => {
    renewRef.current = renew;
    maxRef.current = maxSessionMs;
  });

  const disarm = useCallback(() => {
    epoch.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Call whenever a session has just become the live one. */
  const arm = useCallback(() => {
    disarm();
    const mine = epoch.current;
    const startedAt = Date.now();
    const { renewAfterMs, deadlineMs } = renewalPlan(maxRef.current());
    const attempt = async () => {
      if (epoch.current !== mine) return;
      const ok = await renewRef.current(startedAt + deadlineMs).catch(() => false);
      if (epoch.current !== mine) return;
      if (ok) {
        arm();
        return;
      }
      if (Date.now() - startedAt < deadlineMs) timer.current = setTimeout(attempt, RETRY_MS);
    };
    timer.current = setTimeout(attempt, renewAfterMs);
  }, [disarm]);

  useEffect(() => disarm, [disarm]);

  return { arm, disarm };
}
