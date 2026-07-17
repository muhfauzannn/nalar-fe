import { cn } from "~/lib/utils";

/**
 * Centered, max-width page container. A shared layout primitive used across
 * routes — not a shadcn component and not feature-specific.
 */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 md:px-6", className)}
      {...props}
    />
  );
}
