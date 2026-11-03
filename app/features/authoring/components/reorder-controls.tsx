import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "~/components/ui/button";
import { moveItem } from "../lib/form";

export function ReorderControls({
  ids,
  index,
  label,
  disabled,
  size = "xs",
  onChange,
}: {
  ids: string[];
  index: number;
  label: string;
  disabled?: boolean;
  // `tap` is the 44px pair for a phone; `xs` fits a dense row on a wide screen.
  size?: "xs" | "tap";
  onChange: (ids: string[]) => void;
}) {
  const button = size === "tap" ? "icon-tap" : "icon-xs";
  const hitArea = size === "tap" ? undefined : "after:absolute after:-inset-1.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size={button}
        className={hitArea}
        aria-label={`Naikkan ${label}`}
        disabled={disabled || index === 0}
        onClick={() => onChange(moveItem(ids, index, -1))}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={button}
        className={hitArea}
        aria-label={`Turunkan ${label}`}
        disabled={disabled || index === ids.length - 1}
        onClick={() => onChange(moveItem(ids, index, 1))}
      >
        <ArrowDown />
      </Button>
    </span>
  );
}
