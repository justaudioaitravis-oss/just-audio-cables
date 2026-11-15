import { h } from './dom';
import { icon } from './icons';
import { titleBar } from './common';
import type { App } from '../app';
import { fmtDateTime } from '../pricing';

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

export function renderSettings(app: App): HTMLElement {
  const { meta, data } = app;
  const row = (label: string, ...value: (Node | string | null)[]) =>
    h('div.set-row', {}, h('div.label', {}, label), h('div.set-value', {}, ...value));

  const update = h('button.btn.btn-outline.btn-block', { type: 'button' }, icon('refresh', 18, 2), app.updating ? 'Updating…' : 'Update now');
  if (app.updating) update.setAttribute('disabled', '');
  update.addEventListener('click', () => void app.updateNow());

  const updated = meta.updatedAt
    ? `${relativeTime(meta.updatedAt)} · ${fmtDateTime(new Date(meta.updatedAt))}`
    : 'Built-in prices';

  const unconfirmed = [
    ...data.connectors.filter((c) => !c.confirmed).map((c) => ({ label: c.label, kind: 'Connector' })),
    ...data.cables.filter((c) => !c.confirmed).map((c) => ({ label: c.label, kind: 'Cable' })),
  ];

  const wa = data.settings.accountant_whatsapp;

  return h(
    'section.screen',
    { 'data-screen': 'settings' },
    titleBar('Settings', () => app.back()),
    h(
      'main.body',
      {},
      h(
        'div.wrap.settings',
        {},
        row('Prices updated', h('span#s-updated', {}, updated)),
        update,
        meta.lastError
          ? row(
              'Last error',
              h('span.error#s-error', {}, meta.lastError),
              meta.lastErrorAt ? h('span.set-sub', {}, fmtDateTime(new Date(meta.lastErrorAt))) : null,
            )
          : null,
        row('Accountant WhatsApp', wa ? h('span#s-wa', {}, `+${wa}`) : h('span.error#s-wa', {}, 'Not set')),
        row(
          `Needs checking (${unconfirmed.length})`,
          unconfirmed.length
            ? h('ul.check-list', {}, unconfirmed.map((u) => h('li', {}, h('span', {}, u.label), h('span.set-sub', {}, u.kind))))
            : 'None',
        ),
        row('App version', __APP_VERSION__),
      ),
    ),
  );
}
