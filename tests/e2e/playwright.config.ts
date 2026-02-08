import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for PoReflex E2E tests.
 * Constrained to Chromium and Mobile Chrome only per coding rules.
 * 
 * #9 - CI Browser Caching: Run `npx playwright install --with-deps chromium` in CI
 * before tests to cache browser binaries.
 */

// #5 - Support TABLE_STORAGE_CONNECTION_STRING for Azurite
const azuriteConnectionString = process.env.TABLE_STORAGE_CONNECTION_STRING 
  || "UseDevelopmentStorage=true";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  
  /* Global setup - #6 Docker healthcheck before E2E */
  globalSetup: "./global-setup.ts",

  /* Configure projects for Chromium and Mobile only */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],

  /* Run local dev server before starting tests (development only) */
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "../../src/Po.Reflex.Web",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
        {
          command: `dotnet run --project ../../src/Po.Reflex.Api/Po.Reflex.Api.csproj`,
          url: "http://localhost:5000/api/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          env: {
            // #5 - Pass Azurite connection string to API
            ConnectionStrings__TableStorage: azuriteConnectionString,
          },
        },
      ],
});
