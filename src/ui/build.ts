import { h, option } from './dom';
import { icon } from './icons';
import type { App } from '../app';
import { activeCables, activeConnectors } from '../data';
import { NO_CABLE, inr0, makeCartLine, addToCart, quote } from '../pricing';
import { CUSTOM, LENGTHS, NONE, applyAutoCable, isNoCable, lengthValue, specOf, type EndSel } from '../state';
import type { Tier } from '../types';
import logoUrl from '../../assets/logo.png';

export interface BuildView {
  el: HTMLElement;
  /** Refresh every control from state. */
  sync(): void;
  /** Rebuild dropdown options from price data (keeps selections). */
  renderOptions(): void;
  showMsg(text: string): void;
  focusCustomer(): void;
  scrollTop(): void;
}

interface EndUI {
  key: 'endA' | 'endB';
  wrap: HTMLElement;
  main: HTMLSelectElement;
  second: HTMLSelectElement;
  secondRow: HTMLElement;
  toggle: HTMLButtonElement;
}

const LONG_PRESS_MS = 1000;

export function createBuild(app: App): BuildView {
  // ---------- header ----------
  const logo = h('img.logo', { src: logoUrl, alt: 'Just Audio', width: 128, height: 26, draggable: 'false' });
  attachLongPress(logo, () => app.go('settings'));
  const header = h(
    'header.bar',
    {},
    h('div.bar-in', {}, logo, h('span.bar-divider', { 'aria-hidden': 'true' }), h('span.bar-sub', {}, 'Cable Calculator')),
  );

  // ---------- fields ----------
  const customer = h('input.input#f-customer', { type: 'text', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'next' });
  const phone = h('input.input#f-phone', { type: 'tel', inputmode: 'tel', autocomplete: 'off', enterkeyhint: 'done' });

  customer.addEventListener('input', () => {
    app.order.customer = customer.value;
    changed(false);
  });
  phone.addEventListener('input', () => {
    app.order.phone = phone.value;
    changed(false);
  });

  const ends: EndUI[] = (['endA', 'endB'] as const).map((key) => {
    const id = key === 'endA' ? 'f-end-a' : 'f-end-b';
    const main = h('select.select', { id });
    const second = h('select.select', { id: `${id}-2`, 'aria-label': key === 'endA' ? 'End A second connector' : 'End B second connector' });
    const toggle = h(
      'button.ytoggle',
      { type: 'button', 'aria-label': key === 'endA' ? 'Split End A (Y)' : 'Split End B (Y)', 'aria-pressed': 'false', 'data-testid': `y-${key}` },
      icon(key === 'endA' ? 'yUp' : 'yDown', 24, 1.75),
    );
    const secondRow = h('div.ctrl-row.second', { hidden: true }, second, h('span.branch', { 'aria-hidden': 'true' }));
    const wrap = h(
      'div.field',
      {},
      h('label.label', { for: id }, key === 'endA' ? 'End A' : 'End B'),
      h('div.ctrl-row', {}, main, toggle),
      secondRow,
    );
    const end = (): EndSel => app.order.build[key];

    main.addEventListener('change', () => {
      const e = end();
      e.a = main.value;
      if (!e.a || e.a === NONE) e.b = null;
      applyAutoCable(app.order.build, app.data);
      changed(true);
    });
    second.addEventListener('change', () => {
      end().b = second.value;
      applyAutoCable(app.order.build, app.data);
      changed(true);
    });
    toggle.addEventListener('click', () => {
      const e = end();
      if (!e.a || e.a === NONE) return;
      e.b = e.b ? null : e.a;
      applyAutoCable(app.order.build, app.data);
      changed(true);
    });
    return { key, wrap, main, second, secondRow, toggle };
  });

  const cable = h('select.select#f-cable', {});
  cable.addEventListener('change', () => {
    app.order.build.cable = cable.value;
    changed(true);
  });

  const length = h('select.select#f-length', {}, option('', 'Select length', { disabled: true }));
  for (const l of LENGTHS) length.append(option(l, `${l} m`));
  length.append(option(CUSTOM, 'Custom'));
  const custom = h('input.input.custom-input#f-custom', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    enterkeyhint: 'done',
    'aria-label': 'Custom length in metres',
  });
  const customWrap = h('div.custom', { hidden: true }, custom, h('span.suffix', { 'aria-hidden': 'true' }, 'm'));
  length.addEventListener('change', () => {
    const b = app.order.build;
    b.length = length.value;
    changed(true);
    if (b.length === CUSTOM) custom.focus();
  });
  custom.addEventListener('input', () => {
    app.order.build.custom = custom.value;
    changed(true);
  });

  const lengthField = h('div.field', {}, h('label.label', { for: 'f-length' }, 'Length'), h('div.ctrl-row', {}, length, customWrap));

  // ---------- price cards ----------
  const card = (tier: Tier, label: string) => {
    const value = h('span.card-price', {}, '—');
    const btn = h(
      'button.card',
      { type: 'button', 'data-tier': tier, 'aria-pressed': 'false' },
      h('span.card-check', { 'aria-hidden': 'true' }, icon('check', 14, 2.5)),
      h('span.card-label', {}, label),
      value,
    );
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      app.order.build.tier = tier;
      changed(false);
    });
    return { btn, value };
  };
  const metal = card('metal', 'Neutrik');
  const generic = card('generic', 'Generic metal');
  const plastic = card('plastic', 'Generic plastic');
  const single = card('standard', 'Price');
  const cards = h('div.cards', {}, metal.btn, generic.btn, plastic.btn, single.btn);

  const fields = h(
    'div.wrap.build',
    {},
    h(
      'div.ctrl-row.people',
      {},
      h('div.field.grow-customer', {}, h('label.label', { for: 'f-customer' }, 'Customer'), customer),
      h('div.field.grow-phone', {}, h('label.label', { for: 'f-phone' }, 'Phone'), phone),
    ),
    ends[0].wrap,
    ends[1].wrap,
    h('div.field', {}, h('label.label', { for: 'f-cable' }, 'Cable'), cable),
    lengthField,
    cards,
  );
  const body = h('main.body', {}, fields);

  // ---------- footer ----------
  const msg = h('p.msg', { role: 'alert', hidden: true });
  const proceed = h('button.btn.btn-primary.btn-block', { type: 'button' }, 'Proceed');
  proceed.addEventListener('click', onProceed);
  const footer = h('footer.foot', {}, h('div.wrap', {}, msg, proceed));

  const el = h('section.screen.screen-build', { 'data-screen': 'build' }, header, body, footer);

  // ---------- behaviour ----------
  function changed(structural: boolean): void {
    hideMsg();
    if (structural) sync();
    else syncLight();
    app.save();
  }

  function hideMsg(): void {
    msg.hidden = true;
    msg.textContent = '';
    customer.classList.remove('invalid');
  }

  function showMsg(text: string): void {
    msg.textContent = text;
    msg.hidden = false;
  }

  function onProceed(): void {
    const b = app.order.build;
    if (!b.endA.a) return showMsg('Pick End A');
    if (!b.endB.a) return showMsg('Pick End B');
    if (!b.cable) return showMsg('Pick a cable');
    if (!isNoCable(b) && lengthValue(b) === null) return showMsg('Pick a length');
    const spec = specOf(b);
    if (!spec) return showMsg('Pick a cable'); // "No cable" with both ends None: nothing to sell
    const q = quote(spec, app.data);
    const ok =
      b.tier &&
      ((q.single && b.tier === 'standard') || (!q.single && b.tier !== 'standard' && q[b.tier] !== null));
    if (!ok || !b.tier) return showMsg(q.single ? 'Tap the price' : 'Pick a price');
    const line = makeCartLine(spec, b.tier, app.data, newId());
    if (!line) return showMsg('Pick a price');
    app.order.cart = addToCart(app.order.cart, line);
    b.tier = null;
    app.save();
    sync();
    app.go('cart');
  }

  function renderOptions(): void {
    const conns = activeConnectors(app.data);
    for (const e of ends) {
      e.main.replaceChildren(option('', 'Select connector', { disabled: true }), ...conns.map((c) => option(c.id, c.label)), option(NONE, 'None'));
      e.second.replaceChildren(...conns.map((c) => option(c.id, c.label)));
    }
    cable.replaceChildren(
      option('', 'Select cable', { disabled: true }),
      ...activeCables(app.data).map((c) => option(c.id, c.label)),
      option(NO_CABLE, 'No cable'),
    );
    sync();
  }

  function setSelect(s: HTMLSelectElement, v: string): void {
    s.value = v;
    if (s.value !== v) s.value = '';
    s.classList.toggle('empty', s.value === '');
  }

  /** Full sync of all controls (cheap enough to run on every structural change). */
  function sync(): void {
    const o = app.order;
    const b = o.build;
    if (customer.value !== o.customer) customer.value = o.customer;
    if (phone.value !== o.phone) phone.value = o.phone;
    for (const e of ends) {
      const sel = b[e.key];
      setSelect(e.main, sel.a);
      const canSplit = Boolean(sel.a) && sel.a !== NONE;
      e.toggle.hidden = !canSplit;
      e.wrap.classList.toggle('has-toggle', canSplit);
      const on = canSplit && sel.b !== null;
      e.toggle.setAttribute('aria-pressed', String(on));
      e.secondRow.hidden = !on;
      if (on) setSelect(e.second, sel.b ?? '');
    }
    setSelect(cable, b.cable);
    lengthField.hidden = isNoCable(b);
    setSelect(length, b.length);
    const isCustom = b.length === CUSTOM;
    customWrap.hidden = !isCustom;
    if (custom.value !== b.custom) custom.value = b.custom;
    custom.classList.toggle('invalid', isCustom && b.custom.trim() !== '' && lengthValue(b) === null);
    syncLight();
  }

  /** Prices, tier selection and text fields. */
  function syncLight(): void {
    const b = app.order.build;
    const spec = specOf(b);
    const q = spec ? quote(spec, app.data) : null;
    const isSingle = q ? q.single : false;

    // Drop a selection that no longer fits (tier became unavailable, or the card layout changed).
    if (b.tier) {
      const valid = q
        ? isSingle
          ? b.tier === 'standard'
          : b.tier !== 'standard' && q[b.tier] !== null
        : b.tier !== 'standard'; // incomplete build: keep Metal/Plastic choice
      if (!valid) {
        b.tier = null;
        app.save();
      }
    }

    metal.btn.hidden = isSingle;
    generic.btn.hidden = isSingle;
    plastic.btn.hidden = isSingle;
    single.btn.hidden = !isSingle;
    const paint = (c: { btn: HTMLButtonElement; value: HTMLElement }, tier: Tier, price: number | null) => {
      c.value.textContent = price === null ? '—' : inr0(price);
      c.value.classList.toggle('dash', price === null);
      c.btn.setAttribute('aria-disabled', String(price === null));
      const selected = price !== null && b.tier === tier;
      c.btn.setAttribute('aria-pressed', String(selected));
      c.btn.classList.toggle('selected', selected);
    };
    paint(metal, 'metal', q && !isSingle ? q.metal : null);
    paint(generic, 'generic', q && !isSingle ? q.generic : null);
    paint(plastic, 'plastic', q && !isSingle ? q.plastic : null);
    paint(single, 'standard', q && isSingle ? q.standard : null);
  }

  return {
    el,
    sync,
    renderOptions,
    showMsg(text: string) {
      showMsg(text);
      if (text.includes('name')) customer.classList.add('invalid');
    },
    focusCustomer() {
      customer.focus();
    },
    scrollTop() {
      body.scrollTop = 0;
    },
  };
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function attachLongPress(el: HTMLElement, fn: () => void): void {
  let timer: number | undefined;
  let x = 0;
  let y = 0;
  const cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  el.addEventListener('pointerdown', (e) => {
    x = e.clientX;
    y = e.clientY;
    cancel();
    timer = window.setTimeout(() => {
      timer = undefined;
      fn();
    }, LONG_PRESS_MS);
  });
  el.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) cancel();
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
