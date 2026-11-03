import * as React from "react"

import { cn } from "~/lib/utils"

// A pill you can tap: 44px high, navy when it is the chosen one. Used as a filter
// (`Chip`, announced through aria-pressed) and as the trigger of a tab strip
// (`chipClass` on a Tabs trigger, active through data-active).
const chipClass = cn(
  "inline-flex h-11 flex-none items-center justify-center gap-1.5 rounded-full border-0 bg-card px-4 text-sm font-semibold whitespace-nowrap text-foreground ring-1 ring-border outline-none select-none",
  "transition-[color,background-color,box-shadow,scale] duration-150 ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100",
  "focus-visible:ring-3 focus-visible:ring-ring/50",
  "[&_[data-slot=chip-count]]:font-medium [&_[data-slot=chip-count]]:text-muted-foreground [&_[data-slot=chip-count]]:tabular-nums",
  "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:ring-0 aria-pressed:[&_[data-slot=chip-count]]:text-current",
  "data-active:bg-primary data-active:text-primary-foreground data-active:ring-0 data-active:[&_[data-slot=chip-count]]:text-current"
)

function Chip({
  className,
  pressed,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={pressed}
      className={cn(chipClass, className)}
      {...props}
    />
  )
}

function ChipCount({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="chip-count" className={className} {...props} />
}

export { Chip, ChipCount, chipClass }
