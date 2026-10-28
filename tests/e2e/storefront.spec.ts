import { test, expect, type Page } from '@playwright/test';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error' && /hydration|didn't match|does not match/i.test(msg.text())) list.push(msg.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function hydrated(page: Page, path: string) { await page.goto(path); await expect(page.locator('html')).toHaveClass(/js-ready/); }

test('shop filters, search, sorting, and empty state', async ({ page }) => {
  await hydrated(page, '/shop');
  await expect(page.getByRole('heading', { name: /Good things/ })).toBeVisible();
  await expect(page.locator('.shop-products .product')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ground cinnamon', exact: true }).click();
  await expect(page.locator('.shop-products .product')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'A finer kind of spice' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cinnamon' }).fill('nothing matches this');
  await expect(page.getByRole('heading', { name: 'A little further afield.' })).toBeVisible();
  await page.getByRole('button', { name: 'See all cinnamon' }).click();
  await page.getByRole('combobox', { name: 'Sort products' }).selectOption('price-asc');
  await expect(page.locator('.shop-products .product').first()).toContainText('A finer kind of spice');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('size selection, quantity, persistent bag, keyboard dismissal, and preview checkout', async ({ page }) => {
  await hydrated(page, '/products/whole-ceylon-cinnamon');
  await page.getByRole('button', { name: '100 g', exact: true }).click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: 'Add a little warmth' }).click();
  const bag = page.getByRole('dialog', { name: 'Your bag' });
  await expect(bag.getByText('$64.00', { exact: true })).toBeVisible();
  await expect(bag.getByRole('button', { name: 'Checkout available at launch' })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(bag).toHaveCount(0);
  await page.goto('/blog'); await page.reload();
  await page.getByRole('button', { name: 'Open bag, 2 items', exact: true }).click();
  await expect(bag.getByText('$64.00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove one The original quill, 100 g', exact: true }).click();
  await expect(bag.locator('.cart-total').getByText('$32.00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove one The original quill, 100 g', exact: true }).click();
  await bag.getByRole('link', { name: 'Explore the collection' }).click();
  await expect(page).toHaveURL('/shop');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('journal topics, search, full article, related stories, and missing content', async ({ page }) => {
  await hydrated(page, '/blog');
  await page.getByRole('button', { name: 'Recipes', exact: true }).click();
  await expect(page.locator('.journal-grid .journal-card')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('zzzzzz');
  await expect(page.getByRole('heading', { name: 'Another story is waiting.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to all stories' }).click();
  await page.locator('.featured-copy').getByRole('link', { name: 'Settle into the story' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The beauty of a slower morning.');
  await expect(page.getByRole('heading', { name: 'Begin with the kettle.' })).toBeVisible();
  await expect(page.locator('.related-stories .journal-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const response = await page.goto('/blog/not-a-real-story');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('off the beaten path');
});

test('home interactions and accurate section positions survive the new shared navigation', async ({ page, isMobile }) => {
  await hydrated(page, '/');
  await page.getByRole('link', { name: 'Discover true cinnamon' }).click();
  await expect.poll(() => page.evaluate(() => { const section = document.getElementById('collection')!; return Math.abs(section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).paddingTop) - document.querySelector('header')!.getBoundingClientRect().bottom - 28); }), { timeout: 6000 }).toBeLessThan(2);
  await page.getByRole('button', { name: 'Add The original quill to bag', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('$18.00');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Whole quills or ground cinnamon?' }).click();
  await expect(page.getByRole('button', { name: 'Whole quills or ground cinnamon?' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /The finishing touch/ }).click();
  await expect(page.getByText('Dust a little ground cinnamon', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('test@example.com');
  await page.getByRole('button', { name: 'Preview newsletter signup' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No data has been sent' })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Shop', exact: true }).click();
    await expect(page).toHaveURL('/shop');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Our roots', exact: true }).click();
  } else {
    await page.getByRole('navigation').getByRole('link', { name: 'Shop', exact: true }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Our roots', exact: true }).click();
  }
  await expect(page).toHaveURL('/#story');
  await expect.poll(() => page.evaluate(() => { const section = document.getElementById('story')!; return Math.abs(section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).paddingTop) - document.querySelector('header')!.getBoundingClientRect().bottom - 28); }), { timeout: 6000 }).toBeLessThan(2);
});

test('reduced motion navigation and bag focus loop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hydrated(page, '/');
  await page.getByRole('link', { name: 'Discover true cinnamon' }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('collection');
  await page.getByRole('button', { name: 'Open bag, 0 items', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close bag', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'Explore the collection', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close bag', exact: true })).toBeFocused();
});

test('preview checkout API refuses orders and malformed stored bag cannot break hydration', async ({ page, request }) => {
  const response = await request.post('/api/checkout', { data: { lines: [{ merchandiseId: 'preview-quills-50', quantity: 1 }] } });
  expect(response.status()).toBe(503);
  await page.addInitScript(() => localStorage.setItem('ceylon-bag-v1', '{not-json'));
  await hydrated(page, '/shop');
  await expect(page.getByRole('button', { name: 'Open bag, 0 items', exact: true })).toBeVisible();
});
