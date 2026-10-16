import { expect, test } from '@playwright/test';
import { apiHeaders, defaultStore, dictionary, label } from './stack';

/** Products are picked by SKU, never by name: names are tenant data and change with the seeds. */
const CART = [
  { sku: 'BEV-COLA-350', qty: 3 },
  { sku: 'SNK-CHIPS-45', qty: 2 },
];

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

for (const language of ['es', 'en']) {
  test(`cart, quote, confirmation, order and My orders in ${language}`, async ({ page, request }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    const store = await defaultStore(request);
    const headers = apiHeaders(store, language);
    const text = await dictionary(request, language);
    const exact = (key: string, parameters?: Record<string, string>) => ({ name: label(text, key, parameters), exact: true });

    // Cart: ?lang= sets the language of the whole session
    await page.goto(`/cart?lang=${language}`);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label(text, 'cart.title'));
    for (const line of CART) {
      await page.locator(`input[data-sku="${line.sku}"]`).fill(String(line.qty));
    }
    await page.getByRole('button', exact('cart.actions.quote')).click();

    // Order summary: the quote holds exactly the lines of the cart
    await expect(page).toHaveURL(new RegExp(`/quotes/${UUID}$`));
    const quoteId = new URL(page.url()).pathname.split('/').pop()!;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label(text, 'orderSummary.title'));
    const quoteResponse = await request.get(`/api/v1/quotes/${quoteId}`, { headers });
    expect(quoteResponse.status()).toBe(200);
    const quote = await quoteResponse.json();
    const paidLines = quote.lines.filter((line: { isGift: boolean }) => !line.isGift);
    expect(paidLines.map(({ sku, qty }: { sku: string; qty: number }) => ({ sku, qty }))).toEqual(CART);
    await page.getByRole('button', exact('orderSummary.actions.confirm')).click();

    // Order: the confirmed order of that quote, with the quoted total
    await expect(page).toHaveURL(new RegExp(`/orders/${UUID}$`));
    const orderId = new URL(page.url()).pathname.split('/').pop()!;
    const orderResponse = await request.get(`/api/v1/orders/${orderId}`, { headers });
    expect(orderResponse.status()).toBe(200);
    const order = await orderResponse.json();
    expect(order).toMatchObject({ quoteId, status: 'CONFIRMED', totals: { total: quote.totals.total } });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label(text, 'order.title', { number: order.orderNumber }));
    await expect(page.getByText(label(text, 'order.created.title'), { exact: true })).toBeVisible();
    // The total as the order screen shows it. The suite formats no money: the text must carry the digits of the
    // confirmed total, and My orders must show the very same text.
    const orderTotal = page.locator('.action-bar__total-value');
    await expect(orderTotal).not.toBeEmpty();
    const shownTotal = ((await orderTotal.textContent()) ?? '').trim();
    expect(shownTotal.replace(/\D/g, '')).toBe(order.totals.total.replace(/\D/g, ''));

    // My orders: the new order comes first, with the total the order screen showed
    await page.getByRole('link', exact('order.actions.history')).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label(text, 'history.title'));
    const newest = page.getByRole('main').getByRole('listitem').first();
    await expect(newest).toContainText(order.orderNumber);
    await expect(newest.locator('.order-item__total')).toHaveText(shownTotal);

    // The order history (E-05), read back through the client's origin, returns it first with the confirmed total
    const historyResponse = await request.get(`/api/v1/orders?customerId=${store.customerId}`, { headers });
    expect(historyResponse.status()).toBe(200);
    const history = await historyResponse.json();
    expect(history.items[0]).toMatchObject({ orderId, orderNumber: order.orderNumber, total: order.totals.total });

    expect(browserErrors).toEqual([]);
  });
}
