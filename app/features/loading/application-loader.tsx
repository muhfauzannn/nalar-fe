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

export function ApplicationLoader({
  pathname = "/dashboard",
  state,
  initial = false,
  error,
}: {
  pathname?: string;
  state?: LoadSnapshot;
  initial?: boolean;
  error?: string;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!initial) return;
    const id = setTimeout(() => setSlow(true), 30_000);
    return () => clearTimeout(id);
  }, [initial]);
  const failure =
    error ??
    state?.error ??
    (slow ? "Pemuatan terlalu lama. Periksa koneksi lalu coba lagi." : null);
  const sticker = (
    <div className="size-44 sm:size-48" aria-hidden="true">
      {hydrated && !failure ? (
        <Sticker icon={studyBook} palette={palette} label="" />
      ) : (
        <img
          src={poster}
          alt=""
          width={240}
          height={240}
          className="size-full"
        />
      )}
    </div>
  );
  return (
    <div
      data-application-loader
      className="fixed inset-0 z-[100] grid min-h-svh place-items-center bg-background"
      role={failure ? "alert" : "status"}
      aria-live={failure ? "assertive" : "polite"}
      aria-label={failure ?? loadingTitle(pathname)}
    >
      {failure ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          aria-label={`${failure} Coba lagi dengan menekan stiker.`}
          className="cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {sticker}
        </button>
      ) : (
        sticker
      )}
    </div>
  );
}
