import { expect, test } from '@playwright/test';
import { CSV, longPressLogo, open, pick, sel, serveSheet } from './helpers';

test('changing the sheet updates prices after "Update now"; cart prices stay locked', async ({ page }) => {
  await open(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ja.prices.meta.v1'))).toContain('updatedAt');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click(); // locks ₹1,937
  await page.getByRole('button', { name: 'Back' }).click();

  await serveSheet(page, {
    connectors: CSV.connectors.replace('xlr_m,XLR Male,audio,445', 'xlr_m,XLR Male,audio,545'),
    settings: CSV.settings.replace('accountant_whatsapp,', 'accountant_whatsapp,919822012345'),
  });
  await longPressLogo(page);
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.locator('#s-updated')).toContainText('Just now');
  await expect(page.locator('#s-wa')).toHaveText('+919822012345');
  await expect(page.locator('#s-error')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  // selections kept, new price shown
  await expect(page.locator(sel.endA)).toHaveValue('xlr_m');
  await expect(page.locator(sel.metal)).toContainText('₹2,037');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  const l = page.locator('.line');
  await expect(l).toHaveCount(1); // merged into the locked line
  await expect(l.first()).toContainText('₹3,875');
});

test('invalid sheet data is rejected and the app keeps working', async ({ page }) => {
  await open(page);
  await serveSheet(page, { cables: CSV.cables.replace('mic,Digital mic cable,7443.00', 'mic,Digital mic cable,lots') });
  await longPressLogo(page);
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.locator('#s-error')).toContainText('roll_price_100m');
  await page.getByRole('button', { name: 'Back' }).click();
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await expect(page.locator(sel.metal)).toContainText('₹1,937');
});

test('a download failure is recorded and old prices stay', async ({ page }) => {
  await open(page);
  await serveSheet(page, {}, 500);
  await longPressLogo(page);
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.locator('#s-error')).toContainText('Download failed');
});

test('new rows in the sheet appear in the dropdowns; removed selections are cleared', async ({ page }) => {
  await open(page);
  await page.selectOption(sel.endA, 'rca');
  await serveSheet(page, {
    connectors:
      CSV.connectors.replace('rca,RCA,audio,,180,,PLASTIC RCA,mic,70,TRUE', 'rca,RCA,audio,,180,,PLASTIC RCA,mic,70,FALSE') +
      'mini_xlr,Mini XLR,audio,700,,NEUTRIK MINI,,slim,5,TRUE,FALSE,,\n',
  });
  await longPressLogo(page);
  await page.getByRole('button', { name: 'Update now' }).click();
  await expect(page.locator('#s-updated')).toContainText('Just now');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator(`${sel.endA} option`).nth(1)).toHaveText('Mini XLR');
  await expect(page.locator(sel.endA)).toHaveValue('');
});
