import { defineConfig, devices } from '@playwright/test';

/**
 * The full flow through the browser against a running stack. scripts/e2e runs this suite in a container on the
 * network of the stack it starts, where the web client answers at http://web:8080. E2E_BASE_URL points it at another
 * client, for example http://localhost:8081 for a stack started by hand.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/stack-ready.ts',
  // One worker, in file order: every test orders for the same store, and its newest order must be the one it placed.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 90_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL ?? 'http://web:8080',
  },
});
