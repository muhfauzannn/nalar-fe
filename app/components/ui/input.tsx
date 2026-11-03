import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "~/lib/utils"

// `soft` is the field of the world's sheets: 56px, filled, no border, mint focus ring.
function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & { variant?: "default" | "soft" }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        variant === "soft" &&
          "h-14 rounded-[1.125rem] border-0 bg-surface-soft px-4 py-0 md:text-base focus-visible:ring-brand-mint dark:bg-surface-soft",
        className
      )}
      {...props}
    />
  )
}

export { Input }
