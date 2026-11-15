// Screenshots of every screen and state, for visual review (saved to screenshots/).
import { expect, test, type Page } from '@playwright/test';
import { catchWhatsApp, longPressLogo, open, pick, sel, shot } from './helpers';

const sizes = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
];

async function fillTypical(page: Page) {
  await page.fill(sel.customer, 'Ravi Naik');
  await page.fill(sel.phone, '98220 12345');
  await pick(page, 'xlr_m', 'xlr_f', '10');
}

for (const size of sizes) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    const p = (n: string) => `${size.name}-${n}`;

    test('screens', async ({ page }) => {
      await catchWhatsApp(page);
      await page.clock.install({ time: new Date('2026-11-15T14:17:00+05:30') });
      await open(page);
      await shot(page, p('01-build-blank'));

      await page.getByRole('button', { name: 'Proceed' }).click();
      await shot(page, p('02-build-validation'));

      await fillTypical(page);
      await page.click(sel.metal);
      await shot(page, p('03-build-filled'));

      await page.click(sel.yA);
      await page.selectOption(sel.endA2, 'xlr_f');
      await page.click(sel.yB);
      await shot(page, p('04-build-y-split'));
      await page.click(sel.yA);
      await page.click(sel.yB);

      await page.selectOption(sel.length, 'custom');
      await page.fill(sel.custom, '12.5');
      await page.locator(sel.custom).blur();
      await shot(page, p('05-build-custom-length'));

      await page.selectOption(sel.length, '10');
      await page.click(sel.metal);
      await page.getByRole('button', { name: 'Proceed' }).click();
      await page.getByRole('button', { name: /^Increase/ }).click();
      await page.getByRole('button', { name: 'Add another cable' }).click();
      await page.selectOption(sel.endA, 'jack_ts');
      await page.click(sel.yA);
      await page.selectOption(sel.endB, 'jack_trs');
      await page.selectOption(sel.length, '3');
      await page.click(sel.plastic);
      await page.getByRole('button', { name: 'Proceed' }).click();
      await page.getByRole('button', { name: 'Add another cable' }).click();
      await page.selectOption(sel.endA, 'none');
      await page.selectOption(sel.endB, 'none');
      await page.selectOption(sel.cable, 'spk_12_2');
      await page.selectOption(sel.length, '50');
      await page.click(sel.single);
      await shot(page, p('06-build-loose'));
      await page.getByRole('button', { name: 'Proceed' }).click();
      await shot(page, p('07-cart'));
      await page.getByRole('button', { name: 'Back' }).click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await shot(page, p('07b-build-clear-confirm'));
      await page.getByRole('button', { name: 'Keep' }).click();
      await page.goForward();

      await page.getByRole('button', { name: 'Review order' }).click();
      await shot(page, p('08-summary'));
      await page.locator('[data-screen="summary"] .body').evaluate((e) => (e.scrollTop = e.scrollHeight));
      await shot(page, p('09-summary-bottom'));

      await page.getByRole('button', { name: 'Deny' }).click();
      await shot(page, p('10-deny-confirm'));
      await page.getByRole('button', { name: 'Keep' }).click();

      await page.getByRole('button', { name: 'Approve' }).click();
      await expect(page.locator('[data-screen="sent"]')).toBeVisible();
      await shot(page, p('11-sent'));
      await page.clock.runFor(2500);
      await shot(page, p('12-sent-fallback'));

      await page.getByRole('button', { name: 'New order' }).click();
      await shot(page, p('13-build-after-reset'));

      await pick(page, 'bals_32_5_f', 'bals_32_5_m', '20');
      await shot(page, p('14-build-power'));
      await page.selectOption(sel.endA, 'speakon_8');
      await page.selectOption(sel.endB, 'speakon_8');
      await shot(page, p('15-build-plastic-unavailable'));
      await page.selectOption(sel.endA, 'rca');
      await page.selectOption(sel.endB, 'rca');
      await page.click(sel.generic);
      await shot(page, p('15b-build-generic-metal'));
      await page.selectOption(sel.endA, 'xlr_m');
      await page.selectOption(sel.endB, 'none');
      await page.selectOption(sel.cable, 'no_cable');
      await page.click(sel.metal);
      await shot(page, p('15c-build-loose-connector'));
      await page.selectOption(sel.endB, 'xlr_f');
      await page.selectOption(sel.length, '20');

      await page.getByRole('button', { name: 'Back' }).count(); // no-op: Build has no back arrow

      await page.selectOption(sel.endA, 'xlr_m');
      await page.selectOption(sel.endB, 'xlr_f');
      await page.click(sel.metal);
      await page.getByRole('button', { name: 'Proceed' }).click();
      await page.getByRole('button', { name: /^Decrease/ }).click();
      await shot(page, p('16-cart-empty'));
      await page.getByRole('button', { name: 'Back' }).click();

      await page.clock.resume();
      await longPressLogo(page);
      await shot(page, p('17-settings'));
    });
  });
}
