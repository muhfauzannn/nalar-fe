import { createAuthClient } from "better-auth/react";

import { env } from "~/config/env";

/**
 * Browser-side Better Auth client. The backend owns every auth endpoint under
 * `/api/auth`; credentials must be included because FE and BE use different
 * origins during local development.
 */
export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession } = authClient;
