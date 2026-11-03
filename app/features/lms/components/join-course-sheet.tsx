import { CircleAlert, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useFetcher, useLocation, useNavigation } from "react-router";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "~/components/ui/drawer";

type Rejected = { ok: false; error: string };

// "Gabung ke course" as a sheet over the world: the class code, then the
// course's island. The /courses/join action does the joining and redirects to
// the island, so the camera flies there while the sheet slips away.
export function JoinCourseSheet({ open, code, onClose }: { open: boolean; code: string; onClose: () => void }) {
  const fetcher = useFetcher<Rejected>();
  const field = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigation = useNavigation();
  // The code stays put while the sheet slides out, even though the URL lost it.
  const shownCode = useRef(code);
  if (open) shownCode.current = code;

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
        // the keyboard would cover the sheet the moment it rose, so the student taps it.
        initialFocus={() => (window.matchMedia("(pointer: coarse)").matches ? undefined : field.current)}
        className="mx-auto max-w-lg bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#18153a] [color-scheme:light] data-[swipe-direction=down]:rounded-t-[1.75rem] data-[swipe-direction=down]:border-t-0 sm:p-6"
      >
        <span aria-hidden="true" className="mx-auto mb-4 h-1.5 w-11 shrink-0 rounded-full bg-[#d3c5f8]" />
        <div className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1">
          <div className="flex items-center gap-3 pr-10">
            <img src="/game/cat-avatar.webp" alt="" width={160} height={188} className="size-14 shrink-0 rounded-2xl bg-[#dff7ee] object-cover" />
            <div className="min-w-0">
              <DrawerTitle className="font-heading text-2xl font-bold text-[#18153a]">Gabung ke course</DrawerTitle>
              <DrawerDescription className="text-[#5e5e72]">Masukkan kode dari pengajarmu.</DrawerDescription>
            </div>
          </div>

          <fetcher.Form method="post" action="/courses/join" className="mt-5 flex flex-col gap-3">
            <label htmlFor="join-code" className="text-sm font-semibold">
              Kode kelas
            </label>
            <input
              ref={field}
              id="join-code"
              name="code"
              defaultValue={shownCode.current}
              placeholder="K7M2-QX9P"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "join-code-error" : undefined}
              className="h-14 w-full rounded-[1.125rem] bg-[#f6f3fd] px-4 font-mono text-lg uppercase tracking-widest outline-none placeholder:text-[#5d5a83]/50 focus-visible:ring-3 focus-visible:ring-[#4bd29f] aria-invalid:ring-3 aria-invalid:ring-[#c0392b]"
            />
            {error && (
              <p id="join-code-error" role="alert" className="flex items-start gap-2 rounded-[1.125rem] bg-[#fdecec] p-3 text-sm text-[#9b1c1c]">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="flex min-h-13 items-center justify-center gap-2 rounded-[1.125rem] bg-[#4bd29f] font-bold text-[#04352a] transition-transform duration-150 active:scale-[0.98] disabled:opacity-70"
            >
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {pending ? "Memeriksa" : "Gabung"}
            </button>
          </fetcher.Form>

          <p className="mt-4 text-center text-sm text-[#5e5e72]">
            Ingin mengajar sendiri?{" "}
            <Link to="/manage/courses/new" className="font-semibold text-[#18153a] underline underline-offset-4">
              Buat course
            </Link>
          </p>
        </div>

        <DrawerClose aria-label="Tutup" className="absolute right-3 top-3 grid size-11 place-items-center rounded-full hover:bg-[#f6f3fd]">
          <X className="size-5" aria-hidden="true" />
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
