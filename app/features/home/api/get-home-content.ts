/**
 * Data-access layer for the `home` feature.
 *
 * Route loaders/actions call these functions. Keep all server-only concerns
 * (DB access, secrets, `http` calls to the backend) in this layer — components
 * receive plain data, never fetch it themselves.
 */
export interface HomeContent {
  title: string;
  description: string;
}

export async function getHomeContent(): Promise<HomeContent> {
  // Placeholder. Replace with a real `http.get<HomeContent>("/home")` call
  // (see `~/lib/http`) once the backend endpoint exists.
  return {
    title: "Bernalar",
    description:
      "A structured, maintainable React Router starter with a feature-based architecture and shadcn/ui.",
  };
}
