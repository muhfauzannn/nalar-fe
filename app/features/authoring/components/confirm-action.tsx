import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button type="button" variant={variant} size={size} disabled={disabled} />}
      >
        {icon}
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Batal</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
