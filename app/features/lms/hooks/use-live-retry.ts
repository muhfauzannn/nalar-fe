import { useCallback, useEffect, useRef, useState } from "react";
import {
  HEALTHY_AFTER_MS,
  MAX_AUTO_RETRIES,
  retryDelayMs,
  retryNotice,
  type LiveFailure,
} from "../lib/live-session-policy";

/**
 * Automatic, bounded reconnects for a tutor hook. The hook decides what a failure means (see
 * live-session-policy) and what "try again" does; this keeps the timer, the countdown the student
 * reads, and the attempt budget. The budget only starts over after a session stayed up for a while,
 * so a connection that is accepted and dropped again straight away cannot loop forever.
 */
export function useLiveRetry() {
  const [notice, setNotice] = useState<string | null>(null);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthy = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (ticker.current) clearInterval(ticker.current);
    if (healthy.current) clearTimeout(healthy.current);
    timer.current = ticker.current = healthy.current = null;
  }, []);

  /** The student cancelled, or the hook is going away: forget any scheduled retry. */
  const cancel = useCallback(() => {
    clearTimers();
    setNotice(null);
  }, [clearTimers]);

  /** A student-initiated start: whatever was scheduled before no longer counts. */
  const reset = useCallback(() => {
    clearTimers();
    attempts.current = 0;
    setNotice(null);
  }, [clearTimers]);

  /** A session just became ready. */
  const markReady = useCallback(() => {
    if (healthy.current) clearTimeout(healthy.current);
    setNotice(null);
    healthy.current = setTimeout(() => {
      attempts.current = 0;
    }, HEALTHY_AFTER_MS);
  }, []);

  /**
   * Schedules `run` after the backoff for this failure. Returns false when retrying is not worth
   * it (not retryable, or the allowance is used up) and the caller should show the error.
   */
  const schedule = useCallback(
    (failure: LiveFailure, run: () => void, onScheduled?: (attempt: number, delayMs: number) => void) => {
      if (!failure.autoRetry || attempts.current >= MAX_AUTO_RETRIES) return false;
      clearTimers();
      const attempt = attempts.current++;
      const delay = retryDelayMs(failure, attempt);
      const endsAt = Date.now() + delay;
      const render = () => setNotice(retryNotice(failure, Math.max(0, endsAt - Date.now())));
      render();
      if (delay >= 1_500) ticker.current = setInterval(render, 1_000);
      timer.current = setTimeout(() => {
        clearTimers();
        setNotice("Menyambungkan ulang…");
        run();
      }, delay);
      onScheduled?.(attempt + 1, delay);
      return true;
    },
    [clearTimers],
  );

  const exhausted = useCallback(() => attempts.current >= MAX_AUTO_RETRIES, []);

  useEffect(() => cancel, [cancel]);

  return { notice, schedule, cancel, reset, markReady, exhausted, attempts };
}
