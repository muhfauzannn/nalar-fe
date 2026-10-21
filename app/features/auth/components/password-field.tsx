import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

/**
 * Password input with a show/hide toggle. Local UI state only — no auth logic.
 * The toggle is an icon-only button, so it carries an `aria-label` + `Tooltip`
 * (AGENTS.md rule). The group is pinned to the shared `h-9` control height.
 */
export function PasswordField({
  id,
  name = id,
  autoComplete = "current-password",
  placeholder = "••••••••",
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, "type"> & {
  id: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup className="h-9">
      <InputGroupInput
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShow((v) => !v)}
                disabled={disabled}
                aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              />
            }
          >
            {show ? <EyeOff /> : <Eye />}
          </TooltipTrigger>
          <TooltipContent>
            {show ? "Sembunyikan" : "Tampilkan"}
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
