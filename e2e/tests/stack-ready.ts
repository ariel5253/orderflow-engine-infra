import { type FullConfig, request } from '@playwright/test';
import { apiHeaders, defaultStore } from './stack';

const READY_WITHIN_MS = 180_000;
const POLL_EVERY_MS = 2_000;

/**
 * Waits until the API answers through the web client's origin. The stack's containers are running when the suite
 * starts, but the API takes a while to migrate and listen, and until then the client's nginx answers 502.
 */
export default async function waitForStack(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  const context = await request.newContext({ baseURL });
  const deadline = Date.now() + READY_WITHIN_MS;
  let last = 'no answer yet';
  try {
    while (Date.now() < deadline) {
      try {
        const store = await defaultStore(context);
        const response = await context.get('/api/v1/products', { headers: apiHeaders(store, 'es') });
        if (response.ok()) {
          return;
        }
        last = `GET /api/v1/products answered ${response.status()}`;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
    }
    throw new Error(`The API did not answer through ${baseURL} within ${READY_WITHIN_MS / 1000} s: ${last}`);
  } finally {
    await context.dispose();
  }
}
