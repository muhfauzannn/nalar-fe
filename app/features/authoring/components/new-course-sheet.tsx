import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFetcher, useLocation, useNavigation } from "react-router";

import { Button } from "~/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "~/components/ui/drawer";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Textarea } from "~/components/ui/textarea";
import type { ActionResult, Subject } from "../types";
import { ActionError } from "./action-feedback";

// "Buat course" as a sheet over the list, the sibling of the world's "Gabung ke
// course". /manage/courses/new does the creating and redirects to the editor, so
// the sheet slips away while the editor opens.
export function NewCourseSheet({
  open,
  subjects,
  onClose,
}: {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
}) {
  const fetcher = useFetcher<ActionResult>();
  const field = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigation = useNavigation();

  const leaving = navigation.state === "loading" && navigation.location.pathname !== location.pathname;
  const shown = open && !leaving;
  const pending = fetcher.state !== "idle";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  // A rejection belongs to the try that got it, not to the next time the sheet opens.
  useEffect(() => {
    if (!shown && fetcher.state === "idle" && fetcher.data) fetcher.reset();
  }, [shown, fetcher]);

  return (
    <Drawer open={shown} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent
        keyboardAware
        // With a mouse or keyboard the field is ready to type in; on a touch screen
        // the keyboard would cover the sheet the moment it rose, so the teacher taps it.
        initialFocus={() => (window.matchMedia("(pointer: coarse)").matches ? undefined : field.current)}
        className="mx-auto max-w-lg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[swipe-direction=down]:rounded-t-[1.75rem] data-[swipe-direction=down]:border-t-0 sm:p-6"
      >
        <span aria-hidden="true" className="mx-auto mb-4 h-1.5 w-11 shrink-0 rounded-full bg-brand-lavender" />
        <div className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1">
          <div className="flex items-center gap-3 pr-10">
            <img
              src="/game/cat-avatar.webp"
              alt=""
              width={160}
              height={188}
              className="size-14 shrink-0 rounded-2xl bg-brand-mint-soft object-cover"
            />
            <div className="min-w-0">
              <DrawerTitle className="font-heading text-2xl font-bold">Buat course</DrawerTitle>
              <DrawerDescription>Mulai sebagai draf. Terbitkan saat siap.</DrawerDescription>
            </div>
          </div>

          <fetcher.Form method="post" action="/manage/courses/new" className="mt-5 flex flex-col gap-4">
            <ActionError error={error} />
            <Field>
              <FieldLabel htmlFor="new-course-name" className="font-semibold">
                Nama course
              </FieldLabel>
              <Input
                ref={field}
                id="new-course-name"
                name="name"
                variant="soft"
                required
                maxLength={120}
                autoComplete="off"
                placeholder="mis. Fisika Kelas XI"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-course-subject" className="font-semibold">
                Mata pelajaran
              </FieldLabel>
              <NativeSelect id="new-course-subject" name="subjectId" variant="soft" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  Pilih mata pelajaran
                </NativeSelectOption>
                {subjects.map((subject) => (
                  <NativeSelectOption key={subject.id} value={subject.id}>
                    {subject.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-course-description" className="font-semibold">
                Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
              </FieldLabel>
              <Textarea
                id="new-course-description"
                name="description"
                variant="soft"
                rows={3}
                maxLength={2000}
                placeholder="Apa yang akan dipelajari siswa?"
              />
            </Field>
            <Button type="submit" variant="mint" size="xl" loading={pending} className="w-full">
              Buat course
            </Button>
          </fetcher.Form>
        </div>

        <DrawerClose
          aria-label="Tutup"
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full outline-none hover:bg-surface-soft focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-5" aria-hidden="true" />
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
