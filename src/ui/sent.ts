import { h } from './dom';
import { icon } from './icons';
import type { App } from '../app';
import type { SentInfo } from '../state';
import { inr0 } from '../pricing';
import logoUrl from '../../assets/logo.png';

/** @param fresh true right after Approve (WhatsApp is being opened now). */
export function renderSent(app: App, sent: SentInfo, fresh: boolean): HTMLElement {
  const again = h('button.btn-text', { type: 'button' }, icon('send', 18, 2), 'Send again');
  const copy = h('button.btn-text', { type: 'button' }, icon('copy', 18, 2), 'Copy message');
  again.addEventListener('click', () => app.openWhatsApp(sent.url));
  copy.addEventListener('click', async () => {
    const ok = await copyText(sent.message);
    copy.lastChild!.textContent = ok ? 'Copied' : 'Copy failed';
    window.setTimeout(() => (copy.lastChild!.textContent = 'Copy message'), 2000);
  });
  const fallback = h('div.sent-actions', { hidden: true }, again, copy);

  if (fresh) {
    // If the page never went to the background, WhatsApp probably didn't open: offer the fallbacks.
    let left = false;
    const onHide = () => {
      if (document.visibilityState === 'hidden') left = true;
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => (left = true), { once: true });
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (!left) fallback.hidden = false;
    }, 2000);
  }

  const newOrder = h('button.btn.btn-primary.btn-block', { type: 'button' }, 'New order');
  newOrder.addEventListener('click', () => app.fullReset());

  return h(
    'section.screen',
    { 'data-screen': 'sent' },
    h('header.bar', {}, h('div.bar-in', {}, h('img.logo', { src: logoUrl, alt: 'Just Audio', width: 128, height: 26 }))),
    h(
      'main.body',
      {},
      h(
        'div.wrap.sent',
        {},
        h('span.sent-icon', {}, icon('circleCheck', 64, 1.5)),
        h('h1.sent-title', {}, 'Sent to accountant'),
        h('div.sent-name', {}, sent.customer),
        h('div.sent-total', {}, inr0(sent.total)),
        fallback,
      ),
    ),
    h('footer.foot', {}, h('div.wrap', {}, newOrder)),
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
