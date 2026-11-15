import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const CSV = {
  connectors: readFileSync('public/data/connectors.csv', 'utf8'),
  cables: readFileSync('public/data/cables.csv', 'utf8'),
  settings: readFileSync('public/data/settings.csv', 'utf8'),
};

/** Serve the "Google Sheet" (https://sheet.test/*.csv). Pass overrides to change what it returns. */
export async function serveSheet(page: Page, over: Partial<typeof CSV> = {}, status = 200): Promise<void> {
  await page.unroute('https://sheet.test/**');
  await page.route('https://sheet.test/**', (route) => {
    const url = route.request().url();
    const key = (['connectors', 'cables', 'settings'] as const).find((k) => url.includes(`/${k}.csv`));
    const body = key ? (over[key] ?? CSV[key]) : '';
    return route.fulfill({ status, body, contentType: 'text/csv', headers: { 'access-control-allow-origin': '*' } });
  });
}

/** Capture the WhatsApp hand-off without leaving the page (204 = navigation cancelled). */
export async function catchWhatsApp(page: Page): Promise<string[]> {
  const urls: string[] = [];
  await page.route('https://wa.me/**', (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 204, body: '' });
  });
  return urls;
}

export async function open(page: Page): Promise<void> {
  await serveSheet(page);
  await page.goto('/');
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
}

export const sel = {
  customer: '#f-customer',
  phone: '#f-phone',
  endA: '#f-end-a',
  endA2: '#f-end-a-2',
  endB: '#f-end-b',
  endB2: '#f-end-b-2',
  cable: '#f-cable',
  length: '#f-length',
  custom: '#f-custom',
  yA: '[data-testid="y-endA"]',
  yB: '[data-testid="y-endB"]',
  metal: '.card[data-tier="metal"]',
  generic: '.card[data-tier="generic"]',
  plastic: '.card[data-tier="plastic"]',
  single: '.card[data-tier="standard"]',
  msg: '.screen-build .msg',
};

export async function pick(page: Page, a: string, b: string, length: string): Promise<void> {
  await page.selectOption(sel.endA, a);
  await page.selectOption(sel.endB, b);
  await page.selectOption(sel.length, length);
}

export async function longPressLogo(page: Page): Promise<void> {
  await page.waitForTimeout(400); // taps are ignored briefly after a screen change
  const box = await page.locator('.screen-build .logo').boundingBox();
  if (!box) throw new Error('no logo');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1150);
  await page.mouse.up();
}

export async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(250); // let the screen transition finish
  await page.screenshot({ path: `screenshots/${name}.png` });
}
