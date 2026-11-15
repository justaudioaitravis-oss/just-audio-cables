import { createBuild, type BuildView } from './ui/build';
import { renderCart } from './ui/cart';
import { renderSummary } from './ui/summary';
import { renderSent } from './ui/sent';
import { renderSettings } from './ui/settings';
import { loadInitial, readMeta, refresh, sheetConfigured, type DataMeta } from './data';
import { formatMessage, orderTotal, whatsappUrl } from './pricing';
import { blankOrder, loadOrder, loadSent, sanitizeBuild, saveOrder, saveSent, type Order } from './state';
import type { PriceData } from './types';

export type Screen = 'build' | 'cart' | 'summary' | 'sent' | 'settings';

/** How many history entries each screen sits above Build. */
const DEPTH: Record<Screen, number> = { build: 0, cart: 1, summary: 2, sent: 3, settings: 1 };
const AUTO_REFRESH_MS = 30 * 60 * 1000;
/** After a screen change, ignore taps briefly so a double-tap can't hit the next screen's button. */
const TAP_GUARD_MS = 350;

export class App {
  data: PriceData;
  meta: DataMeta;
  order: Order;
  updating = false;
  screen: Screen = 'build';

  private root: HTMLElement;
  private build: BuildView;
  private current: HTMLElement | null = null;
  private afterPop: (() => void) | null = null;
  private lastRefresh = 0;
  private freshSent = false;
  private guardTimer: number | undefined;
  private inPlace = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.data = loadInitial();
    this.meta = readMeta();
    this.order = loadOrder();
    sanitizeBuild(this.order.build, this.data);
    this.build = createBuild(this);
    this.build.renderOptions();

    window.addEventListener('popstate', (e) => this.onPop(e.state));
    const st = history.state as { screen?: Screen } | null;
    const start = st?.screen && st.screen in DEPTH ? st.screen : 'build';
    if (!st?.screen) history.replaceState({ screen: 'build' }, '');
    this.show(this.allowed(start), false);

    this.backgroundRefresh();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - this.lastRefresh > AUTO_REFRESH_MS) {
        this.backgroundRefresh();
      }
    });
    window.addEventListener('online', () => this.backgroundRefresh());
  }

  save(): void {
    saveOrder(this.order);
  }

  // ---------- navigation ----------

  go(screen: Screen): void {
    history.pushState({ screen }, '');
    this.show(screen, true);
  }

  back(): void {
    history.back();
  }

  /** Return to Build by unwinding history, then run `after`. */
  home(after?: () => void): void {
    const d = DEPTH[this.screen];
    if (d > 0) {
      this.afterPop = after ?? null;
      history.go(-d);
    } else {
      after?.();
    }
  }

  private onPop(state: { screen?: Screen } | null): void {
    const s = state?.screen && state.screen in DEPTH ? state.screen : 'build';
    this.show(this.allowed(s), true);
    const fn = this.afterPop;
    this.afterPop = null;
    fn?.();
  }

  /** Screens whose content would be empty fall back to an earlier one. */
  private allowed(s: Screen): Screen {
    if (s === 'summary' && this.order.cart.length === 0) return 'cart';
    if (s === 'sent' && !loadSent()) return this.order.cart.length ? 'summary' : 'build';
    return s;
  }

  private show(screen: Screen, animate: boolean): void {
    this.screen = screen;
    let el: HTMLElement;
    if (screen === 'build') {
      this.build.sync();
      el = this.build.el;
    } else if (screen === 'cart') el = renderCart(this);
    else if (screen === 'summary') el = renderSummary(this);
    else if (screen === 'settings') el = renderSettings(this);
    else {
      const sent = loadSent();
      el = sent ? renderSent(this, sent, this.freshSent) : this.build.el;
      this.freshSent = false;
    }
    if (this.current !== el) {
      this.current?.remove();
      el.classList.remove('enter');
      if (animate) {
        void el.offsetWidth; // restart the animation
        el.classList.add('enter');
      }
      this.root.append(el);
      this.current = el;
      if (animate && !this.inPlace) this.guardTaps(el);
    }
    document.title = 'Cable Calculator';
  }

  private guardTaps(el: HTMLElement): void {
    for (const s of this.root.querySelectorAll('.screen.guard')) s.classList.remove('guard');
    el.classList.add('guard');
    window.clearTimeout(this.guardTimer);
    this.guardTimer = window.setTimeout(() => el.classList.remove('guard'), TAP_GUARD_MS);
  }

  /** Re-render the current (non-Build) screen in place. */
  refreshScreen(): void {
    if (this.screen === 'build') return this.build.sync();
    const scroll = this.current?.querySelector('.body')?.scrollTop ?? 0;
    const before = this.current;
    this.current = null;
    before?.remove();
    this.inPlace = true;
    this.show(this.allowed(this.screen), false);
    this.inPlace = false;
    const body = this.current ? (this.current as HTMLElement).querySelector('.body') : null;
    if (body) body.scrollTop = scroll;
  }

  // ---------- order actions ----------

  fullReset(): void {
    this.order = blankOrder();
    saveSent(null);
    this.save();
    this.home(() => {
      this.build.sync();
      this.build.scrollTop();
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }

  approve(): void {
    if (!this.order.customer.trim()) {
      this.home(() => {
        this.build.showMsg("Add the customer's name");
        this.build.focusCustomer();
      });
      return;
    }
    const total = orderTotal(this.order.cart);
    const message = formatMessage(
      this.order.cart,
      this.order.customer,
      this.order.phone,
      this.data.settings.business_name,
      new Date(),
    );
    const url = whatsappUrl(this.data.settings.accountant_whatsapp, message);
    saveSent({ customer: this.order.customer.trim(), total, message, url });
    this.freshSent = true;
    this.go('sent');
    this.openWhatsApp(url);
  }

  openWhatsApp(url: string): void {
    window.location.href = url;
  }

  // ---------- price data ----------

  private applyData(d: PriceData): void {
    this.data = d;
    sanitizeBuild(this.order.build, d);
    this.save();
    this.build.renderOptions();
  }

  private backgroundRefresh(): void {
    if (!sheetConfigured() || navigator.onLine === false || this.updating) return;
    void this.updateNow();
  }

  async updateNow(): Promise<void> {
    if (this.updating) return;
    this.updating = true;
    this.lastRefresh = Date.now();
    if (this.screen === 'settings') this.refreshScreen();
    const r = await refresh();
    this.updating = false;
    if (r.ok) this.applyData(r.data);
    this.meta = readMeta();
    if (this.screen === 'settings' || this.screen === 'build') this.refreshScreen();
  }
}
