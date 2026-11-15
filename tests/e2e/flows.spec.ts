import { expect, test, type Page } from '@playwright/test';
import { catchWhatsApp, longPressLogo, open, pick, sel } from './helpers';

const lines = (page: Page) => page.locator('[data-screen="cart"] .line');

async function expectBlankBuild(page: Page) {
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await expect(page.locator(sel.customer)).toHaveValue('');
  await expect(page.locator(sel.phone)).toHaveValue('');
  for (const s of [sel.endA, sel.endB, sel.cable, sel.length]) await expect(page.locator(s)).toHaveValue('');
  await expect(page.locator(sel.endA)).toHaveClass(/empty/);
  await expect(page.locator(sel.yA)).toBeHidden();
  await expect(page.locator(sel.yB)).toBeHidden();
  await expect(page.locator(sel.endA2)).toBeHidden();
  await expect(page.locator(sel.endB2)).toBeHidden();
  await expect(page.locator(sel.custom)).toBeHidden();
  for (const c of [sel.metal, sel.generic, sel.plastic]) await expect(page.locator(c)).toContainText('—');
  await expect(page.locator(sel.length)).toBeVisible();
  await expect(page.locator('.card.selected')).toHaveCount(0);
  await expect(page.locator(sel.msg)).toBeHidden();
  expect(await page.locator('[data-screen="build"] .body').evaluate((e) => e.scrollTop)).toBe(0);
}

test('fresh launch shows a completely blank Build screen', async ({ page }) => {
  await open(page);
  await expectBlankBuild(page);
  await expect(page.locator(sel.endA)).toContainText('Select connector');
  await expect(page.locator(sel.cable)).toContainText('Select cable');
  await expect(page.locator(sel.length)).toContainText('Select length');
});

test('typical quote: XLR M → XLR F, mic auto, 10 m shows both prices', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await expect(page.locator(sel.cable)).toHaveValue('mic');
  await expect(page.locator(sel.metal)).toContainText('₹1,937');
  await expect(page.locator(sel.plastic)).toContainText('₹1,280');
});

test('validation messages appear one at a time, in order', async ({ page }) => {
  await open(page);
  const proceed = page.getByRole('button', { name: 'Proceed' });
  const msg = page.locator(sel.msg);
  await proceed.click();
  await expect(msg).toHaveText('Pick End A');
  await page.selectOption(sel.endA, 'xlr_m');
  await expect(msg).toBeHidden();
  await proceed.click();
  await expect(msg).toHaveText('Pick End B');
  await page.selectOption(sel.endB, 'none');
  // cable auto-set from End A, so next is length
  await proceed.click();
  await expect(msg).toHaveText('Pick a length');
  await page.selectOption(sel.length, 'custom');
  await expect(page.locator(sel.custom)).toBeFocused();
  await page.fill(sel.custom, '600');
  await proceed.click();
  await expect(msg).toHaveText('Pick a length');
  await page.fill(sel.custom, '2.5');
  await proceed.click();
  await expect(msg).toHaveText('Pick a price');
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
});

test('"Pick a cable" when every end is None and no cable chosen', async ({ page }) => {
  await open(page);
  await page.selectOption(sel.endA, 'none');
  await page.selectOption(sel.endB, 'none');
  await expect(page.locator(sel.cable)).toHaveValue('');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator(sel.msg)).toHaveText('Pick a cable');
});

test('simple cable goes to the cart', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await expect(page.locator(sel.metal)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
  await expect(lines(page)).toHaveCount(1);
  await expect(lines(page).first()).toContainText('10m XLR Male – XLR Female');
  await expect(lines(page).first()).toContainText('Neutrik · ₹1,937');
  await expect(page.locator('.total-value')).toHaveText('₹1,937');
});

test('Y split: second dropdown defaults to the same connector; example 5 price', async ({ page }) => {
  await open(page);
  await page.selectOption(sel.endA, 'xlr_m');
  await expect(page.locator(sel.yA)).toBeVisible();
  await page.click(sel.yA);
  await expect(page.locator(sel.yA)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(sel.endA2)).toHaveValue('xlr_m');
  await page.selectOption(sel.endA2, 'xlr_f');
  await page.selectOption(sel.endB, 'jack_trs');
  await page.selectOption(sel.length, '3');
  await expect(page.locator(sel.metal)).toContainText('₹2,044');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).first()).toContainText('3m XLR Male + XLR Female – Jack TRS (stereo)');
  // back keeps selections; turning Y off removes the second connector
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator(sel.endA2)).toHaveValue('xlr_f');
  await page.click(sel.yA);
  await expect(page.locator(sel.endA2)).toBeHidden();
  await expect(page.locator(sel.metal)).toContainText('₹1,414'); // 445+510+223.29+236
});

test('auto cable picks slim for EP, re-applies on connector change, can be overridden', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'ep', '5');
  await expect(page.locator(sel.cable)).toHaveValue('slim');
  await page.selectOption(sel.cable, 'snake_4');
  await expect(page.locator(sel.cable)).toHaveValue('snake_4');
  await page.selectOption(sel.endA, 'ep');
  await expect(page.locator(sel.cable)).toHaveValue('slim');
  await expect(page.locator(sel.metal)).toContainText('₹1,588'); // example 3
});

test('loose cable: None → None shows one PRICE card with no service charge', async ({ page }) => {
  await open(page);
  await page.selectOption(sel.endA, 'none');
  await expect(page.locator(sel.yA)).toBeHidden();
  await page.selectOption(sel.endB, 'none');
  await page.selectOption(sel.cable, 'spk_12_2');
  await page.selectOption(sel.length, '50');
  await expect(page.locator(sel.metal)).toBeHidden();
  await expect(page.locator(sel.single)).toBeVisible();
  await expect(page.locator(sel.single)).toContainText('Price');
  await expect(page.locator(sel.single)).toContainText('₹12,778');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator(sel.msg)).toHaveText('Tap the price');
  await page.click(sel.single);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).first()).toContainText('50m Speaker 12 AWG 2-core (loose)');
  await expect(lines(page).first()).toContainText('Standard · ₹12,778');
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('[data-screen="summary"]')).not.toContainText('SERVICE CHARGE');
});

test('power connector shows a single PRICE card using metal prices', async ({ page }) => {
  await open(page);
  await pick(page, 'powercon_in', 'powercon_out', '5');
  await expect(page.locator(sel.cable)).toHaveValue('mic');
  await expect(page.locator(sel.metal)).toBeHidden();
  // 616 + 642 + 372.15 + 236 = 1866.15
  await expect(page.locator(sel.single)).toContainText('₹1,866');
  await page.click(sel.single);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).first()).toContainText('Standard · ₹1,866');
});

test('plastic unavailable shows — and ignores taps', async ({ page }) => {
  await open(page);
  await pick(page, 'speakon_8', 'speakon_8', '5');
  await expect(page.locator(sel.cable)).toHaveValue('spk_12_4');
  await expect(page.locator(sel.plastic)).toContainText('—');
  await page.click(sel.plastic, { force: true });
  await expect(page.locator(sel.plastic)).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator(sel.msg)).toHaveText('Pick a price');
});

test('identical cables merge; Add another cable keeps selections; stepper to zero removes', async ({ page }) => {
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Add another cable' }).click();
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await expect(page.locator(sel.customer)).toHaveValue('Ravi');
  await expect(page.locator(sel.endA)).toHaveValue('xlr_m');
  await expect(page.locator('.card.selected')).toHaveCount(0);
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page)).toHaveCount(1);
  await expect(lines(page).first().locator('.step-qty')).toHaveText('2');
  await expect(lines(page).first()).toContainText('Neutrik · ₹3,875');
  await expect(page.locator('.total-value')).toHaveText('₹3,875');

  await page.getByRole('button', { name: /^Increase/ }).click();
  await expect(lines(page).first().locator('.step-qty')).toHaveText('3');
  await expect(page.locator('.total-value')).toHaveText('₹5,812');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Decrease/ }).click();
  await expect(lines(page)).toHaveCount(0);
  await expect(page.getByText('Cart is empty')).toBeVisible();
  await expect(page.locator('.total-value')).toHaveText('₹0');
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
});

async function buildExample7(page: Page) {
  await page.fill(sel.customer, 'Ravi');
  await page.fill(sel.phone, '98220 12345');
  await pick(page, 'xlr_m', 'xlr_f', '10');
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
  await expect(page.locator('.total-value')).toHaveText('₹5,202');
}

test('order summary shows the consolidated breakdown (example 7)', async ({ page }) => {
  await open(page);
  await buildExample7(page);
  await page.getByRole('button', { name: 'Review order' }).click();
  const s = page.locator('[data-screen="summary"]');
  await expect(s.locator('.cust-name')).toHaveText('Ravi');
  await expect(s.locator('.cust-phone')).toHaveText('98220 12345');
  const items = s.locator('.item');
  await expect(items).toHaveCount(6);
  await expect(items.nth(0)).toContainText('NEUTRIK NC3MXX');
  await expect(items.nth(0)).toContainText('2 pcs × ₹445.00');
  await expect(items.nth(0)).toContainText('₹890.00');
  await expect(items.nth(2)).toContainText('KRYSTAL DIGITAL MIC CABLE');
  await expect(items.nth(2)).toContainText('23 m × ₹74.43');
  await expect(items.nth(2)).toContainText('₹1,711.89');
  await expect(items.nth(5)).toContainText('SERVICE CHARGE');
  await expect(items.nth(5)).toContainText('7 pts × ₹100 = ₹700.00');
  await expect(items.nth(5)).toContainText('₹700.00 + 18% GST (₹126.00)');
  await expect(items.nth(5)).toContainText('₹826.00');
  await expect(s.locator('.grand-value')).toHaveText('₹5,202');
  // back arrow → Cart
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
});

test('Approve sends the exact accountant message and shows Sent; New order resets', async ({ page }) => {
  const wa = await catchWhatsApp(page);
  await page.clock.install({ time: new Date('2026-11-15T14:17:00+05:30') });
  await open(page);
  await buildExample7(page);
  await page.getByRole('button', { name: 'Review order' }).click();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('[data-screen="sent"]')).toBeVisible();
  await expect(page.getByText('Sent to accountant')).toBeVisible();
  await expect(page.locator('.sent-name')).toHaveText('Ravi');
  await expect(page.locator('.sent-total')).toHaveText('₹5,202');
  await expect.poll(() => wa.length).toBe(1);
  const url = new URL(wa[0]);
  expect(url.pathname).toBe('/'); // no accountant number in the bundled settings
  expect(url.searchParams.get('text')).toBe(
    [
      'JUST AUDIO – Cable order',
      'Customer: Ravi (98220 12345)',
      '15 Nov 2026, 2:17 pm',
      '',
      'NEUTRIK NC3MXX',
      '2 pcs × ₹445.00 = ₹890.00',
      'NEUTRIK NC3FXX',
      '2 pcs × ₹512.00 = ₹1,024.00',
      'KRYSTAL DIGITAL MIC CABLE',
      '23 m × ₹74.43 = ₹1,711.89',
      'PLASTIC JACK TS',
      '2 pcs × ₹250.00 = ₹500.00',
      'PLASTIC JACK TRS',
      '1 pcs × ₹250.00 = ₹250.00',
      'SERVICE CHARGE',
      '7 pts × ₹100 = ₹700.00',
      '₹700.00 + 18% GST (₹126.00) = ₹826.00',
      '',
      'TOTAL: ₹5,202',
    ].join('\n'),
  );
  // WhatsApp "didn't open" (the page stayed visible) → fallbacks appear
  await page.clock.runFor(2500);
  await expect(page.getByRole('button', { name: 'Send again' })).toBeVisible();
  await page.getByRole('button', { name: 'Send again' }).click();
  await expect.poll(() => wa.length).toBe(2);

  await page.getByRole('button', { name: 'New order' }).click();
  await expectBlankBuild(page);
  // history was unwound: back does not return to the old order
  await page.reload();
  await expectBlankBuild(page);
});

test('Approve without a name goes back to Build and asks for it', async ({ page }) => {
  const wa = await catchWhatsApp(page);
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('.cust-name')).toHaveText('No name');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await expect(page.locator(sel.msg)).toHaveText("Add the customer's name");
  await expect(page.locator(sel.customer)).toBeFocused();
  expect(wa).toHaveLength(0);
});

test('Deny → Keep keeps the order; Deny → Clear fully resets', async ({ page }) => {
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await page.fill(sel.phone, '98220 12345');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.yB);
  await page.selectOption(sel.length, 'custom');
  await page.fill(sel.custom, '12');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await page.getByRole('button', { name: 'Deny' }).click();
  await expect(page.getByText('Clear this order?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
  await page.getByRole('button', { name: 'Deny' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expectBlankBuild(page);
  await page.goBack().catch(() => {});
  // back from a fresh Build must not resurrect the cart
  await page.goto('/');
  await expectBlankBuild(page);
});

test('browser back follows Build → Cart → Summary order', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('[data-screen="summary"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
  await expect(page.locator(sel.endA)).toHaveValue('xlr_m');
  await page.goForward();
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
});

test('order survives closing and reopening the app', async ({ page }) => {
  await open(page);
  await page.fill(sel.customer, 'Asha');
  await page.fill(sel.phone, '99999 00000');
  await pick(page, 'jack_ts', 'jack_trs', '7');
  await page.click(sel.yA);
  await page.click(sel.plastic);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.selectOption(sel.length, 'custom');
  await page.fill(sel.custom, '4.5');
  await page.goto('about:blank');
  await page.goto('/');
  await expect(page.locator(sel.customer)).toHaveValue('Asha');
  await expect(page.locator(sel.phone)).toHaveValue('99999 00000');
  await expect(page.locator(sel.endA2)).toHaveValue('jack_ts');
  await expect(page.locator(sel.length)).toHaveValue('custom');
  await expect(page.locator(sel.custom)).toHaveValue('4.5');
  await page.getByRole('button', { name: 'Proceed' }).click(); // no tier selected → stays
  await page.click(sel.plastic);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page)).toHaveCount(2);
});

test('long-press on the logo opens Settings', async ({ page }) => {
  await open(page);
  await longPressLogo(page);
  const s = page.locator('[data-screen="settings"]');
  await expect(s).toBeVisible();
  await expect(s).toContainText('Prices updated');
  await expect(s).toContainText('Needs checking');
  await expect(s).toContainText('Jack TRS (stereo)');
  await expect(s.locator('#s-wa')).toHaveText('Not set');
  await expect(s).toContainText('App version');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
});

test('a short tap on the logo does nothing', async ({ page }) => {
  await open(page);
  await page.locator('.screen-build .logo').click();
  await page.waitForTimeout(1200);
  await expect(page.locator('[data-screen="build"]')).toBeVisible();
});

test('three price rows: Neutrik, Generic metal, Generic plastic', async ({ page }) => {
  await open(page);
  await pick(page, 'rca', 'rca', '2');
  await expect(page.locator(sel.metal)).toContainText('Neutrik');
  await expect(page.locator(sel.metal)).toContainText('—');
  await expect(page.locator(sel.generic)).toContainText('Generic metal');
  await expect(page.locator(sel.generic)).toContainText('₹965');
  await expect(page.locator(sel.plastic)).toContainText('Generic plastic');
  await page.click(sel.metal, { force: true });
  await expect(page.locator('.card.selected')).toHaveCount(0);
  await page.click(sel.generic);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).first()).toContainText('2m RCA – RCA');
  await expect(lines(page).first()).toContainText('Generic metal · ₹965');
  await page.getByRole('button', { name: 'Add another cable' }).click();
  await page.click(sel.plastic);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).nth(1)).toContainText('Generic plastic · ₹745');
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('.item').first()).toContainText('AMPHENOL ACPR');
});

test('loose connectors: No cable hides Length, prices connectors only, no service charge', async ({ page }) => {
  const wa = await catchWhatsApp(page);
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await page.selectOption(sel.endA, 'xlr_m');
  await page.click(sel.yA);
  await page.selectOption(sel.endA2, 'xlr_f');
  await page.selectOption(sel.endB, 'none');
  await page.selectOption(sel.cable, 'no_cable');
  await expect(page.locator(sel.length)).toBeHidden();
  await expect(page.locator(sel.metal)).toContainText('₹957');
  await expect(page.locator(sel.plastic)).toContainText('₹300');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator(sel.msg)).toHaveText('Pick a price');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page).first()).toContainText('XLR Male + XLR Female (loose)');
  await expect(lines(page).first()).toContainText('Neutrik · ₹957');
  await page.getByRole('button', { name: 'Review order' }).click();
  await expect(page.locator('[data-screen="summary"]')).not.toContainText('SERVICE CHARGE');
  await expect(page.locator('.item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect.poll(() => wa.length).toBe(1);
  const text = new URL(wa[0]).searchParams.get('text')!;
  expect(text).not.toContain('SERVICE CHARGE');
  expect(text).not.toContain(' m × ');
  expect(text).toContain('TOTAL: ₹957');
});

test('No cable with both ends None asks for a cable', async ({ page }) => {
  await open(page);
  await page.selectOption(sel.endA, 'none');
  await page.selectOption(sel.endB, 'none');
  await page.selectOption(sel.cable, 'no_cable');
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(page.locator(sel.msg)).toHaveText('Pick a cable');
});

test('custom length refuses non-numbers like 1e2', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', 'custom');
  await page.fill(sel.custom, '1e2');
  await expect(page.locator(sel.metal)).toContainText('—');
  await page.fill(sel.custom, '1,5');
  await expect(page.locator(sel.metal)).toContainText('₹1,305');
});

/** Two physical taps 60 ms apart at the same spot (Playwright's normal click would wait out the guard). */
async function doubleTap(page: Page, selector: string) {
  await page.waitForTimeout(500); // a person reads the screen before the first tap
  const box = (await page.locator(selector).boundingBox())!;
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
}

test('double-tapping Review order does not approve the order', async ({ page }) => {
  const wa = await catchWhatsApp(page);
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await doubleTap(page, '[data-screen="cart"] .btn-primary');
  await expect(page.locator('[data-screen="summary"]')).toBeVisible();
  expect(wa).toHaveLength(0);
});

test('double-tapping Approve sends once and keeps the Sent screen', async ({ page }) => {
  const wa = await catchWhatsApp(page);
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await doubleTap(page, '.btn-approve');
  await expect(page.locator('[data-screen="sent"]')).toBeVisible();
  expect(wa).toHaveLength(1);
});

test('double-tapping Proceed adds one cable and stays on the Cart', async ({ page }) => {
  await open(page);
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  // tap where Proceed's right side overlaps the Cart's Review order button
  const box = (await page.getByRole('button', { name: 'Proceed' }).boundingBox())!;
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(box.x + box.width - 30, box.y + box.height / 2);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  await expect(page.locator('[data-screen="cart"]')).toBeVisible();
  await expect(lines(page)).toHaveCount(1);
  await expect(lines(page).first().locator('.step-qty')).toHaveText('1');
});

test('length dropdown goes up to 100 m, then Custom', async ({ page }) => {
  await open(page);
  const opts = await page.locator(`${sel.length} option`).allTextContents();
  expect(opts.slice(-7)).toEqual(['50 m', '60 m', '70 m', '80 m', '90 m', '100 m', 'Custom']);
  await pick(page, 'xlr_m', 'xlr_f', '100');
  // 445 + 512 + 7443 + 236
  await expect(page.locator(sel.metal)).toContainText('₹8,636');
});

test('Clear on Build with an empty cart clears every field at once', async ({ page }) => {
  await open(page);
  await page.fill(sel.customer, 'Old customer');
  await page.fill(sel.phone, '12345');
  await pick(page, 'xlr_m', 'xlr_f', 'custom');
  await page.fill(sel.custom, '12');
  await page.click(sel.yA);
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expectBlankBuild(page);
  await page.reload();
  await expectBlankBuild(page);
});

test('Clear on Build with cables in the cart asks first; Keep keeps, Clear resets everything', async ({ page }) => {
  await open(page);
  await page.fill(sel.customer, 'Ravi');
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('Clear this order?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proceed' })).toBeHidden();
  await page.getByRole('button', { name: 'Keep' }).click();
  await expect(page.locator(sel.customer)).toHaveValue('Ravi');
  await expect(page.getByRole('button', { name: 'Proceed' })).toBeVisible();
  // confirm disappears if staff carry on editing instead
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.selectOption(sel.length, '5');
  await expect(page.getByText('Clear this order?')).toBeHidden();
  // now really clear
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.locator('.foot .btn-danger').click();
  await expectBlankBuild(page);
  await page.click(sel.metal, { force: true });
  await pick(page, 'xlr_m', 'xlr_f', '10');
  await page.click(sel.metal);
  await page.getByRole('button', { name: 'Proceed' }).click();
  await expect(lines(page)).toHaveCount(1); // the old cable is gone
});
