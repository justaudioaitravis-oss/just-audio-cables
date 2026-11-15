import { expect, test } from '@playwright/test';
import { pick, sel } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('after one load the app opens and calculates offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  // make sure the SW controls the page and the precache is complete
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await expect(page.locator('.screen-build .logo')).toHaveJSProperty('complete', true);
  expect(await page.locator('.screen-build .logo').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(449);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await expect(page.locator(sel.metal)).toContainText('₹1,937');
  // Inter (incl. the ₹ glyph subset) loads from the cache while offline
  const loaded = await page.evaluate(async () => (await document.fonts.load('500 30px Inter', '₹1,937')).length);
  expect(loaded).toBeGreaterThanOrEqual(2);

  // a brand-new tab, still offline
  const p2 = await context.newPage();
  await p2.goto('/');
  await expect(p2.locator('[data-screen="build"]')).toBeVisible();
  await context.setOffline(false);
});

test('manifest is valid for installation', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await request.get(new URL(href!, page.url()).toString());
  const m = await res.json();
  expect(m.name).toBe('Cable Calculator');
  expect(m.short_name).toBe('Cables');
  expect(m.display).toBe('standalone');
  expect(m.theme_color).toBe('#003862');
  const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']));
  for (const i of m.icons) expect((await request.get(new URL(i.src, page.url()).toString())).ok()).toBe(true);
  expect((await request.get('/sw.js')).ok()).toBe(true);
});
