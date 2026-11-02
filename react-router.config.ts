import type { Config } from "@react-router/dev/config";

export default {
  // Keep SSR for public/SEO routes. Authenticated `_app*` routes opt into
  // CSR individually with clientLoader/clientAction + HydrateFallback.
  ssr: true,
  // Every route is known from the first page load. With lazy discovery a first
  // visit to a route waited on /__manifest round trips before its code and data
  // (1.5 s to the classroom on a slow phone); the whole manifest is small.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
