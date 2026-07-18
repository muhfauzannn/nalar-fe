/**
 * Data-access layer for the `home` feature.
 *
 * Route loaders/actions call these functions. Keep all server-only concerns
 * (DB access, secrets, `http` calls to the backend) in this layer — components
 * receive plain data, never fetch it themselves.
 */
export interface HomeContent {
  hero: {
    /** Headline. `{highlight}` marks the phrase drawn over the mint motif. */
    title: string;
    highlight: string;
    titleTail: string;
    description: string;
    cta: { label: string; href: string };
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  // Placeholder. Replace with a real `http.get<HomeContent>("/home")` call
  // (see `~/lib/http`) once the backend endpoint exists.
  return {
    hero: {
      title: "Pakai AI",
      highlight: "Tanpa Kehilangan",
      titleTail: "Cara Berpikirmu.",
      description:
        "NALAR memandu siswa lewat 5 tahap terstruktur — bukan sekadar mengecek kemiripan teks — supaya guru bisa melihat proses berpikir siswa yang sebenarnya, bukan cuma hasil akhirnya.",
      cta: { label: "Daftar Sekarang", href: "/register" },
    },
  };
}
