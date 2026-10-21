import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

// Two icons in one cell that cross-fade (scale + a hint of blur) when `done`
// flips. Fixed size, so the button around it never changes width. `data-icon`
// keeps the Button's inline-start padding rule working.
export function IconSwap({
  done,
  idle,
  finished,
}: {
  done: boolean;
  idle: ReactNode;
  finished: ReactNode;
}) {
  const hidden = "scale-50 opacity-0 blur-[2px] motion-reduce:scale-100 motion-reduce:blur-none";
  const layer =
    "col-start-1 row-start-1 inline-flex transition-[opacity,scale,filter] duration-150 ease-out-strong";
  return (
    <span data-icon="inline-start" aria-hidden="true" className="inline-grid size-4 place-items-center">
      <span className={cn(layer, done && hidden)}>{idle}</span>
      <span className={cn(layer, !done && hidden)}>{finished}</span>
    </span>
  );
}
