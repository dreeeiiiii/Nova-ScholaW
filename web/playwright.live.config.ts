import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/live", testMatch: "*.spec.ts", outputDir: "./live-test-results",
  timeout: 60_000, workers: 1,
  reporter: [["list"], ["json", { outputFile: "live-test-results/report.json" }]],
  use: { baseURL: "http://localhost:3200", browserName: "chromium", channel: "chrome", trace: "retain-on-failure" },
  webServer: [
    { command: "node --import ./tests/safe-network.js --experimental-test-module-mocks ../web/e2e/live/api.mjs", cwd: "../server", url: "http://127.0.0.1:5056/api/auth/departments", reuseExistingServer: process.env.UI_REUSE_SERVERS === "1", env: { NODE_ENV: "test", BATCH1_DATABASE_URL: process.env.BATCH1_DATABASE_URL ?? "" } },
    { command: "node node_modules/next/dist/bin/next start --port 3200", url: "http://localhost:3200/login", reuseExistingServer: process.env.UI_REUSE_SERVERS === "1", timeout: 120_000, env: { API_URL: "http://127.0.0.1:5056", NEXT_PUBLIC_API_URL: "http://127.0.0.1:5056" } },
  ],
});
