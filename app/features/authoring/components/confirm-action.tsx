import { useState, type ReactNode } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

// For actions that cannot be undone, or that invalidate something other people
// are holding (a class code that was already shared).
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "outline",
  size = "sm",
  disabled,
  icon,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: "outline" | "destructive" | "ghost";
  size?: "sm" | "xs" | "default";
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant={variant} size={size} disabled={disabled} />}
      >
        {icon}
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
