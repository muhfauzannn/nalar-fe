/**
 * Typed, validated access to environment variables.
 *
 * - Client-safe values must be prefixed `VITE_` and read from `import.meta.env`.
 *   They are inlined into the browser bundle, so NEVER put secrets here.
 * - Server-only secrets (API keys, DB URLs) must be read from `process.env`
 *   inside a `loader`/`action` or a `.server.ts` module — not from this file.
 */
function required(value: string | undefined, name: string): string {
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  /** Public base URL of the app. */
  appUrl: import.meta.env.VITE_APP_URL ?? "http://localhost:5173",
  /** Base URL of the backend API consumed from the browser. */
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  /** Vite build mode. */
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
} as const;

// `required` is exported for env values you want to hard-fail on at boot.
export { required };
