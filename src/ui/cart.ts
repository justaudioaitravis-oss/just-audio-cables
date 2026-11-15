import { h } from './dom';
import { icon } from './icons';
import { titleBar } from './common';
import type { App } from '../app';
import { inr0, lineTotal, orderTotal, tierLabel } from '../pricing';

export function renderCart(app: App): HTMLElement {
  const cart = app.order.cart;
  const rerender = () => app.refreshScreen();

  const rows = cart.map((line) => {
    const dec = h('button.step-btn', { type: 'button', 'aria-label': `Decrease quantity of ${line.title}` }, icon('minus', 18, 2));
    const inc = h('button.step-btn', { type: 'button', 'aria-label': `Increase quantity of ${line.title}` }, icon('plus', 18, 2));
    dec.addEventListener('click', () => {
      if (line.qty <= 1) app.order.cart = app.order.cart.filter((l) => l.id !== line.id);
      else line.qty -= 1;
      app.save();
      rerender();
    });
    inc.addEventListener('click', () => {
      line.qty += 1;
      app.save();
      rerender();
    });
    return h(
      'li.line',
      {},
      h(
        'div.line-info',
        {},
        h('div.line-title', {}, line.title),
        h('div.line-sub', {}, `${tierLabel(line.tier)} · `, h('span.line-amt', {}, inr0(lineTotal(line)))),
      ),
      h('div.stepper', {}, dec, h('span.step-qty', { 'aria-live': 'polite' }, String(line.qty)), inc),
    );
  });

  const add = h('button.btn.btn-dashed.btn-block', { type: 'button' }, icon('plus', 18, 2), 'Add another cable');
  add.addEventListener('click', () => app.back());

  const content = h(
    'div.wrap.cart',
    {},
    cart.length ? h('ul.lines', {}, rows) : h('p.cart-empty', {}, 'Cart is empty'),
    add,
  );

  const review = h('button.btn.btn-primary', { type: 'button' }, 'Review order');
  review.addEventListener('click', () => {
    if (app.order.cart.length) app.go('summary');
  });

  return h(
    'section.screen',
    { 'data-screen': 'cart' },
    titleBar('Cart', () => app.back()),
    h('main.body', {}, content),
    h(
      'footer.foot',
      {},
      h(
        'div.wrap.foot-total',
        {},
        h('div.total', {}, h('span.total-label', {}, 'Total'), h('span.total-value', {}, inr0(orderTotal(cart)))),
        review,
      ),
    ),
  );
}
