import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

// A plain <select>: it submits with the surrounding form without the extra
// wiring the popover-based Select needs, and works with the keyboard and on
// phones out of the box.
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
