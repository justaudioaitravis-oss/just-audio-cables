import { h } from './dom';
import { icon } from './icons';
import { titleBar } from './common';
import type { App } from '../app';
import { consolidate, inr0, inr2, inrShort, itemQtyText, pct } from '../pricing';

export function renderSummary(app: App): HTMLElement {
  const o = app.order;
  const c = consolidate(o.cart);
  const name = o.customer.trim();
  const phone = o.phone.trim();

  const pair = (left: string, right: string) =>
    h('div.item-row', {}, h('span.item-calc', {}, left), h('span.item-amt', {}, right));

  const items = c.items.map((it) =>
    h('li.item', {}, h('div.item-name', {}, it.name), pair(`${itemQtyText(it)} × ${inr2(it.rate)}`, inr2(it.amount))),
  );
  const service = c.service.map((s) =>
    h(
      'li.item.service',
      {},
      h('div.item-name', {}, 'SERVICE CHARGE'),
      h('div.item-row', {}, h('span.item-calc', {}, `${s.points} pts × ${inrShort(s.rate)} = ${inr2(s.base)}`)),
      pair(`${inr2(s.base)} + ${pct(s.gst)} GST (${inr2(s.gstAmount)})`, inr2(s.total)),
    ),
  );

  const content = h(
    'div.wrap.summary',
    {},
    h(
      'div.cust',
      {},
      name ? h('div.cust-name', {}, name) : h('div.cust-name.missing', {}, 'No name'),
      phone ? h('div.cust-phone', {}, phone) : null,
    ),
    h('ul.items', {}, items, service),
    h('div.grand', {}, h('span.grand-label', {}, 'Total'), h('span.grand-value', {}, inr0(c.total))),
  );

  const footWrap = h('div.wrap');
  const showMain = () => {
    const deny = h('button.btn.btn-deny', { type: 'button' }, 'Deny');
    const approve = h('button.btn.btn-approve', { type: 'button' }, icon('whatsapp', 20, 2), 'Approve');
    deny.addEventListener('click', showConfirm);
    approve.addEventListener('click', () => app.approve());
    footWrap.replaceChildren(h('div.btn-pair', {}, deny, approve));
  };
  const showConfirm = () => {
    const keep = h('button.btn.btn-outline', { type: 'button' }, 'Keep');
    const clear = h('button.btn.btn-danger', { type: 'button' }, 'Clear');
    keep.addEventListener('click', showMain);
    clear.addEventListener('click', () => app.fullReset());
    footWrap.replaceChildren(h('p.confirm', { role: 'alert' }, 'Clear this order?'), h('div.btn-pair', {}, keep, clear));
  };
  showMain();

  return h(
    'section.screen',
    { 'data-screen': 'summary' },
    titleBar('Order summary', () => app.back()),
    h('main.body', {}, content),
    h('footer.foot', {}, footWrap),
  );
}
