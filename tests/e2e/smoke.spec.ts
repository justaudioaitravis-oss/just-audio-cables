import { test } from '@playwright/test';
import { open, pick, sel, shot } from './helpers';

test('smoke screenshots', async ({ page }) => {
  await open(page);
  await shot(page, 'tmp-blank');
  await page.fill(sel.customer, 'Ravi');
  await page.fill(sel.phone, '98220 12345');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.click(sel.yA);
  await shot(page, 'tmp-filled');
});
