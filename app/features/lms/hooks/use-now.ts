import { useEffect, useState } from "react";

/** The current time, refreshed every minute, so "besok" turns into "hari ini" without a reload. */
export function useNow(every = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(timer);
  }, [every]);
  return now;
}
