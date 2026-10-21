import { useState, type ComponentProps } from "react";

import { cn } from "~/lib/utils";
import { stagger } from "../lib/motion";

// A list row that enters once (fade + 6px rise, staggered by `index`) and is then
// left alone. The enter class is dropped when its animation ends: React moves DOM
// nodes when a list is reordered, and a moved node would otherwise replay its
// entrance on top of the FLIP slide.
export function ListItem({
  index = 0,
  flipKey,
  className,
  style,
  onAnimationEnd,
  ...props
}: ComponentProps<"li"> & { index?: number; flipKey?: string }) {
  const [entering, setEntering] = useState(true);
  return (
    <li
      data-flip-key={flipKey}
      className={cn(entering && "enter-up", className)}
      style={{ ...stagger(index), ...style }}
      onAnimationEnd={(event) => {
        // Nested animations (an error alert, a spinner) bubble up; ignore them.
        if (event.target === event.currentTarget) setEntering(false);
        onAnimationEnd?.(event);
      }}
      {...props}
    />
  );
}
