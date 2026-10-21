import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1280, height: 960 },
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node scripts/copy-pdf-assets.mjs && node node_modules/vite/bin/vite.js --config tests/vite.config.ts",
    url: "http://127.0.0.1:4174/tests/fixtures/pdf-study.html",
    reuseExistingServer: !process.env.CI,
  },
});
