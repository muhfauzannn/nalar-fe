import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "~/components/ui/button";
import { moveItem } from "../lib/form";

export function ReorderControls({
  ids,
  index,
  label,
  disabled,
  onChange,
}: {
  ids: string[];
  index: number;
  label: string;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Naikkan ${label}`}
        disabled={disabled || index === 0}
        onClick={() => onChange(moveItem(ids, index, -1))}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Turunkan ${label}`}
        disabled={disabled || index === ids.length - 1}
        onClick={() => onChange(moveItem(ids, index, 1))}
      >
        <ArrowDown />
      </Button>
    </span>
  );
}
