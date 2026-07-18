import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

/**
 * Password input with a show/hide toggle. Local UI state only — no auth logic.
 * The toggle is an icon-only button, so it carries an `aria-label` + `Tooltip`
 * (AGENTS.md rule). Keeps the shared `h-9` control height via `pr-10` padding.
 */
export function PasswordField({
  id,
  name = id,
  autoComplete = "current-password",
  placeholder = "••••••••",
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  id: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={cn("pr-10", className)}
        disabled={disabled}
        {...props}
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShow((v) => !v)}
              disabled={disabled}
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground active:not-aria-[haspopup]:-translate-y-1/2"
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
