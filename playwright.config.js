import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 200,
      threshold: 0.3,
    },
  },

  // Desktop keyboard only (gameplan anti-goal: no mobile).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Two servers: Vite, plus the PartyKit room server for multiplayer specs.
  // Single-player specs never pass ?mp=1, so they stay pure-local even with
  // the party server up (deterministic advanceTime stepping).
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npx partykit dev --port 1999',
      url: 'http://127.0.0.1:1999/parties/main/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
