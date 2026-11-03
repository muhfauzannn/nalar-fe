import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "~/lib/utils"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  // `soft` matches the soft Input: 56px, filled, no border, mint focus ring.
  variant?: "default" | "soft"
}

function NativeSelect({
  className,
  size = "default",
  variant = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-full has-[select:disabled]:opacity-50",
        className
      )}
      data-slot="native-select-wrapper"
      data-size={size}
      data-variant={variant}
    >
      <select
        data-slot="native-select"
        data-size={size}
        data-variant={variant}
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-3 text-base transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:h-8 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5 md:text-sm dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          variant === "soft" &&
            "h-14 rounded-[1.125rem] border-0 bg-surface-soft py-0 pr-12 pl-4 md:text-base focus-visible:ring-brand-mint dark:bg-surface-soft dark:hover:bg-surface-soft"
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none group-data-[variant=soft]/native-select:right-4 group-data-[variant=soft]/native-select:size-5"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
