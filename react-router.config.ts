import type { Config } from "@react-router/dev/config";

export default {
  // Keep SSR for public/SEO routes. Authenticated `_app*` routes opt into
  // CSR individually with clientLoader/clientAction + HydrateFallback.
  ssr: true,
} satisfies Config;
