// Current order (customer, Build selections, cart) and its persistence.
import type { CableSpec, CartLine, PriceData, Tier } from './types';
import { storage } from './storage';
import { autoCable, findCable, findConnector } from './pricing';

export const NONE = 'none';
export const CUSTOM = 'custom';
export const LENGTHS = ['0.5', '1', '2', '3', '5', '7', '10', '15', '20', '25', '30', '40', '50'];
export const MIN_LEN = 0.1;
export const MAX_LEN = 500;

/** One end: `a` is '' (not chosen), 'none', or a connector id. `b` is the Y second connector (null = Y off). */
export interface EndSel {
  a: string;
  b: string | null;
}

export interface BuildSel {
  endA: EndSel;
  endB: EndSel;
  cable: string;
  length: string; // '' | one of LENGTHS | 'custom'
  custom: string;
  tier: Tier | null;
}

export interface Order {
  customer: string;
  phone: string;
  build: BuildSel;
  cart: CartLine[];
}

export interface SentInfo {
  customer: string;
  total: number;
  message: string;
  url: string;
}

const ORDER_KEY = 'ja.order.v1';
const SENT_KEY = 'ja.sent.v1';

export function blankBuild(): BuildSel {
  return { endA: { a: '', b: null }, endB: { a: '', b: null }, cable: '', length: '', custom: '', tier: null };
}

export function blankOrder(): Order {
  return { customer: '', phone: '', build: blankBuild(), cart: [] };
}

export function loadOrder(): Order {
  const o = storage.getJSON<Order>(ORDER_KEY);
  if (!o || typeof o !== 'object' || !o.build || !Array.isArray(o.cart)) return blankOrder();
  const b = blankBuild();
  return {
    customer: String(o.customer ?? ''),
    phone: String(o.phone ?? ''),
    build: {
      endA: { ...b.endA, ...o.build.endA },
      endB: { ...b.endB, ...o.build.endB },
      cable: String(o.build.cable ?? ''),
      length: String(o.build.length ?? ''),
      custom: String(o.build.custom ?? ''),
      tier: o.build.tier ?? null,
    },
    cart: o.cart.filter((l) => l && typeof l.unitPrice === 'number' && l.qty > 0),
  };
}

export function saveOrder(o: Order): void {
  storage.setJSON(ORDER_KEY, o);
}

export function loadSent(): SentInfo | null {
  return storage.getJSON<SentInfo>(SENT_KEY);
}

export function saveSent(s: SentInfo | null): void {
  if (s) storage.setJSON(SENT_KEY, s);
  else storage.remove(SENT_KEY);
}

// ---------- derived values ----------

export function endIds(e: EndSel): string[] {
  if (!e.a || e.a === NONE) return [];
  return e.b ? [e.a, e.b] : [e.a];
}

export function lengthValue(b: BuildSel): number | null {
  const s = b.length === CUSTOM ? b.custom.trim().replace(',', '.') : b.length;
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < MIN_LEN || n > MAX_LEN) return null;
  return n;
}

/** A full spec when both ends, cable and a valid length are set; otherwise null. */
export function specOf(b: BuildSel): CableSpec | null {
  const len = lengthValue(b);
  if (!b.endA.a || !b.endB.a || !b.cable || len === null) return null;
  return { endA: endIds(b.endA), endB: endIds(b.endB), cableId: b.cable, lengthM: len };
}

/** Re-apply the automatic cable choice (after any connector change). */
export function applyAutoCable(b: BuildSel, data: PriceData): void {
  const id = autoCable([...endIds(b.endA), ...endIds(b.endB)], data);
  if (id) b.cable = id;
}

/** After new price data: drop selections whose ids no longer exist or are inactive. */
export function sanitizeBuild(b: BuildSel, data: PriceData): void {
  const okConn = (id: string) => {
    const c = findConnector(data, id);
    return Boolean(c && c.active);
  };
  for (const e of [b.endA, b.endB]) {
    if (e.a && e.a !== NONE && !okConn(e.a)) e.a = '';
    if (e.b && (!okConn(e.b) || !e.a || e.a === NONE)) e.b = null;
  }
  const cable = findCable(data, b.cable);
  if (b.cable && !(cable && cable.active)) b.cable = '';
  if (b.length && b.length !== CUSTOM && !LENGTHS.includes(b.length)) b.length = '';
}
