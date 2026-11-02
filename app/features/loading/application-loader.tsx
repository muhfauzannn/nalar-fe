import { useEffect, useState } from "react";
import { Sticker } from "./stickers/Sticker";
import { studyBook } from "./stickers/icons";
import { brand } from "./stickers/fun";
import poster from "./assets/study-book.png?inline";
import type { LoadSnapshot } from "./readiness";

const palette = brand("#d3c5f8", "#4bd29f");
export function loadingTitle(pathname: string) {
  if (pathname === "/dashboard") return "Menyiapkan dashboard";
  if (pathname.endsWith("/kelas")) return "Menyiapkan kelas";
  if (pathname === "/dunia") return "Menyiapkan dunia";
  if (pathname.startsWith("/lessons/")) return "Menyiapkan materi";
  if (pathname.startsWith("/quizzes/")) return "Menyiapkan kuis";
  if (pathname.startsWith("/assignments/")) return "Menyiapkan tugas";
  return "Menyiapkan ruang belajar";
}

export function ApplicationLoader({ pathname = "/dashboard", state, initial = false, error }: { pathname?: string; state?: LoadSnapshot; initial?: boolean; error?: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!initial) return;
    const id = setTimeout(() => setSlow(true), 30_000);
    return () => clearTimeout(id);
  }, [initial]);
  const failure = error ?? state?.error ?? (slow ? "Pemuatan terlalu lama. Periksa koneksi lalu coba lagi." : null);
  const description = failure ?? (state?.phase === "scene" ? "Menyusun ruangan dan menyiapkan tempat belajarmu." : state?.phase === "assets" ? "Menyiapkan gambar, huruf, dan tampilan halaman." : state?.phase === "resource" ? "Membuka materi belajarmu." : "Mengambil data dan menyiapkan halaman untukmu.");
  return (
    <div data-application-loader className="fixed inset-0 z-[100] grid min-h-svh place-items-center overflow-y-auto bg-background px-6 py-10 text-foreground" role={failure ? "alert" : "status"} aria-live="polite" aria-busy={!failure}>
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="font-heading text-xs font-semibold tracking-[0.24em] text-muted-foreground">BERNALAR</span>
        <div className="my-5 size-44 overflow-hidden rounded-[2rem] bg-white sm:size-48" aria-hidden="true">
          {hydrated ? <Sticker icon={studyBook} palette={palette} label="" /> : <img src={poster} alt="" width={240} height={240} className="size-full" />}
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">{failure ? "Belum berhasil dimuat" : loadingTitle(pathname)}</h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
        {!failure && state?.phase === "assets" && state.total > 0 && <p className="mt-4 text-xs tabular-nums text-muted-foreground">{state.completed} dari {state.total} aset siap</p>}
        {failure && <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]">Coba lagi</button>}
      </div>
    </div>
  );
}
