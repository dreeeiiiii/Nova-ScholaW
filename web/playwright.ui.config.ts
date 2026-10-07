import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/ui",
  testMatch: "*.spec.ts",
  outputDir: "./ui-test-results",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: process.env.UI_REPORT_PATH ?? "ui-test-results/report.json" }]],
  use: { baseURL: "http://localhost:3100", browserName: "chromium", channel: "chrome", trace: "retain-on-failure" },
  webServer: [
    { command: "node e2e/ui/mock-api.mjs", url: "http://127.0.0.1:5055/api/categories", reuseExistingServer: process.env.UI_REUSE_SERVERS === "1" },
    { command: "node node_modules/next/dist/bin/next dev --port 3100", url: "http://localhost:3100/login", reuseExistingServer: process.env.UI_REUSE_SERVERS === "1", timeout: 120_000, env: { API_URL: "http://127.0.0.1:5055", NEXT_PUBLIC_API_URL: "http://127.0.0.1:5055" } },
  ],
});
