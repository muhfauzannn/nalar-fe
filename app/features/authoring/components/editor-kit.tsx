import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// The pieces every editor under "Kelola course" is built from, so they read as one tool:
// - EditorSection: a heading, one line of help, an action on the right, then the content. Sections are
//   split by a hairline; cards are kept for things you can pick up or open (a question, a course).
// - SaveBar: forms save from one floating bar that shows up once something changed (Ctrl/Cmd+S too).
// - StatusMenu (status-menu.tsx): the only way to change a status.

export function EditorSection({
  id,
  title,
  description,
  action,
  className,
  children,
  ref,
  sectionId,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
  sectionId?: string;
}) {
  return (
    <section ref={ref} id={sectionId} aria-labelledby={id} className={cn("flex flex-col gap-5 border-t pt-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Whether an uncontrolled form differs from what it had when it was drawn. Pass the same `version` the form
 * is keyed on (its saved values): a save remounts the form, and a new version takes a fresh snapshot.
 */
export function useFormDirty(form: RefObject<HTMLFormElement | null>, version: string) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const element = form.current;
    if (!element) return;
    const read = () => JSON.stringify([...new FormData(element).entries()].map(([key, value]) => [key, String(value)]));
    const initial = read();
    const check = () => setDirty(read() !== initial);
    // reset fires before the fields change back
    const later = () => requestAnimationFrame(check);
    element.addEventListener("input", check);
    element.addEventListener("change", check);
    element.addEventListener("reset", later);
    setDirty(false);
    return () => {
      element.removeEventListener("input", check);
      element.removeEventListener("change", check);
      element.removeEventListener("reset", later);
    };
  }, [form, version]);
  return dirty;
}

/** "Tersimpan" for two seconds after a save that went through. */
export function useSavedFlash(pending: boolean, error: string | null | undefined) {
  const [saved, setSaved] = useState(false);
  const was = useRef(pending);
  useEffect(() => {
    if (was.current && !pending && !error) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      was.current = pending;
      return () => clearTimeout(timer);
    }
    was.current = pending;
  }, [pending, error]);
  return saved;
}

export type SavePart = { dirty: boolean; save: () => void; discard: () => void };

/**
 * The page's one save button, floating at the bottom while anything is unsaved. Each part (a form, a
 * rubric) says whether it changed and how to save and discard itself; Simpan saves every changed part.
 */
export function SaveBar({ parts, pending, error }: { parts: SavePart[]; pending: boolean; error?: string | null }) {
  const dirty = parts.filter((part) => part.dirty);
  const saved = useSavedFlash(pending, error);
  const latest = useRef(dirty);
  latest.current = dirty;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        latest.current.forEach((part) => part.save());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (dirty.length === 0 && !pending && !saved) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div
        role="status"
        className="enter-up pointer-events-auto flex items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-lg"
      >
        {saved && dirty.length === 0 ? (
          <span className="flex items-center gap-1.5 py-1.5 pr-2.5">
            <Check className="size-4 text-brand-mint" aria-hidden="true" />
            Tersimpan
          </span>
        ) : (
          <>
            <span className="pr-1">Ada perubahan</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-background hover:bg-background/10 hover:text-background"
              onClick={() => dirty.forEach((part) => part.discard())}
              disabled={pending}
            >
              Batalkan
            </Button>
            <Button type="button" size="sm" variant="mint" loading={pending} onClick={() => dirty.forEach((part) => part.save())}>
              Simpan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** A SavePart for an ordinary form: dirty from its fields, saved by submitting it, discarded by resetting it. */
export function useFormPart(form: RefObject<HTMLFormElement | null>, version: string): SavePart {
  const dirty = useFormDirty(form, version);
  return {
    dirty,
    save: () => form.current?.requestSubmit(),
    discard: () => form.current?.reset(),
  };
}
