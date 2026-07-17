import { useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

/** Client-side light/dark preview toggle (not persisted — this is a preview page). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={dark ? "Switch to light" : "Switch to dark"}
            onClick={toggle}
          >
            {dark ? <MoonIcon /> : <SunIcon />}
          </Button>
        }
      />
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
