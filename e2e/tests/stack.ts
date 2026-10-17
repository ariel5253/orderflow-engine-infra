import type { APIRequestContext } from '@playwright/test';

/** A store of the web client's public/config/stores.json: the tenant and the customer every API call speaks for. */
export interface Store {
  readonly tenantId: string;
  readonly customerId: string;
  readonly name: string;
}

/** A runtime dictionary of the web client, as it serves it under /i18n/. */
export type Dictionary = { readonly [key: string]: string | Dictionary };

/** The store the client selects until another one is picked: the first configured one. */
export async function defaultStore(request: APIRequestContext): Promise<Store> {
  const response = await request.get('/config/stores.json');
  if (!response.ok()) {
    throw new Error(`GET /config/stores.json answered ${response.status()}`);
  }
  const [first] = (await response.json()) as Store[];
  if (!first) {
    throw new Error('/config/stores.json lists no store');
  }
  return first;
}

/** The headers the client's interceptor sends with every API call. */
export function apiHeaders(store: Store, language: string): Record<string, string> {
  return { 'X-Tenant-Id': store.tenantId, 'X-Customer-Id': store.customerId, 'Accept-Language': language };
}

/** The client's dictionary of one language, so the suite clicks the labels a user of that language reads. */
export async function dictionary(request: APIRequestContext, language: string): Promise<Dictionary> {
  const response = await request.get(`/i18n/${language}.json`);
  if (!response.ok()) {
    throw new Error(`GET /i18n/${language}.json answered ${response.status()}`);
  }
  return (await response.json()) as Dictionary;
}

/** The text of a dictionary key, with its {{parameters}} replaced, as the client renders it. */
export function label(dictionary: Dictionary, key: string, parameters: Record<string, string> = {}): string {
  let value: string | Dictionary | undefined = dictionary;
  for (const part of key.split('.')) {
    value = typeof value === 'object' ? value[part] : undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`The dictionary has no text for ${key}`);
  }
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, name: string) => parameters[name] ?? placeholder);
}
