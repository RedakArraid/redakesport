import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:5177',
    headless: true,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node apps/api/src/server.mjs',
      url: 'http://127.0.0.1:3002/api/health',
      env: {
        PORT: '3002',
        TRUST_PROXY: 'true',
        APP_ORIGIN: 'http://localhost:5177',
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ||
          'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test',
      },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev --workspace=apps/web -- --port 5177 --strictPort',
      url: 'http://localhost:5177',
      env: { API_PROXY: 'http://127.0.0.1:3002' },
      reuseExistingServer: false,
    },
  ],
})
