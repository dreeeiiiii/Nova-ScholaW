import { defineConfig } from "@playwright/test";

// Assume backend (:5000) and web dev server (:3000) are running when `npm run test:e2e` is invoked.
// Do NOT use webServer option.
// Cleanup: tests use unique P45_VERIFY_<random> titles and delete via backend in afterEach.

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
