const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000/api/health",
    reuseExistingServer: false,
    env: {
      NUTRIAI_DB_PATH: "work/browser-tests.sqlite",
      NUTRIAI_AI_PROVIDER: "disabled",
      NUTRIAI_SMS_PROVIDER: "disabled",
      NUTRIAI_FOOD_PROVIDER: "local",
      NUTRIAI_REQUIRE_VERIFIED_PHONE: "false",
    },
  },
});
