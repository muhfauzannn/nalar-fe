import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

/**
 * Password input with a show/hide toggle. Local UI state only — no auth logic.
 * The toggle is an icon-only button, so it carries an `aria-label` + `Tooltip`
 * (AGENTS.md rule). Keeps the shared `h-9` control height via `pr-10` padding.
 */
export function PasswordField({
  id,
  autoComplete = "current-password",
  placeholder = "••••••••",
}: {
  id: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-10"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff /> : <Eye />}
            </Button>
          }
        />
        <TooltipContent>
          {show ? "Sembunyikan" : "Tampilkan"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
