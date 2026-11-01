import { Box, Map as MapIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

import { setWorld3d, useWorld3d } from "./mode";

/** Switches the world routes between the 3D world and the 2D pages, per device. */
export function WorldModeToggle() {
  const on = useWorld3d();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={on}
      onClick={() => setWorld3d(!on)}
      title={on ? "Pakai tampilan 2D yang lebih ringan" : "Pakai dunia 3D"}
      className="gap-1.5"
    >
      {on ? <MapIcon className="size-4" aria-hidden="true" /> : <Box className="size-4" aria-hidden="true" />}
      <span className="max-sm:sr-only">{on ? "Mode ringan" : "Dunia 3D"}</span>
    </Button>
  );
}
