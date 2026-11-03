import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { formatJoinCode } from "../lib/form";
import { IconSwap } from "./icon-swap";

// A 44px tile that copies the class code. The code is on screen next to it, so a
// blocked clipboard (insecure origin, denied permission) just does nothing.
export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatJoinCode(code));
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Nothing to do: see above.
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label={`Salin kode ${formatJoinCode(code)}`}
        onClick={copy}
        className={cn("size-11 shrink-0 rounded-[0.875rem] bg-card text-foreground hover:bg-card/70 dark:hover:bg-card/70", className)}
      >
        <IconSwap done={copied} idle={<Copy />} finished={<Check />} />
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Kode tersalin ke papan klip" : ""}
      </span>
    </>
  );
}
