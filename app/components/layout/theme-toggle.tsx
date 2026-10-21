import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

/**
 * Light/dark toggle for shared application chrome. The choice is remembered;
 * until the user picks one the theme follows the system (see the inline script
 * in `root.tsx`, which applies it before first paint).
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this page.
    }
  }

  const label = dark ? "Pakai tema terang" : "Pakai tema gelap";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label={label} onClick={toggle}>
            {dark ? <MoonIcon /> : <SunIcon />}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
