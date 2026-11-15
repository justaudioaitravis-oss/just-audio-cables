// Pure pricing logic. No DOM access here, so everything is unit-testable.
import type { Cable, CableSpec, CartLine, Connector, Part, PriceData, Tier } from './types';

/** Cable dropdown value for loose connectors (no cable, no soldering). */
export const NO_CABLE = 'no_cable';

// ---------- lookups ----------

export function findConnector(data: PriceData, id: string): Connector | undefined {
  return data.connectors.find((c) => c.id === id);
}

export function findCable(data: PriceData, id: string): Cable | undefined {
  return data.cables.find((c) => c.id === id);
}

export function allConnectorIds(spec: Pick<CableSpec, 'endA' | 'endB'>): string[] {
  return [...spec.endA, ...spec.endB];
}

/** True when the build shows one PRICE card: any power connector, or both ends None. */
export function isSingleMode(spec: Pick<CableSpec, 'endA' | 'endB'>, data: PriceData): boolean {
  const ids = allConnectorIds(spec);
  if (ids.length === 0) return true;
  return ids.some((id) => findConnector(data, id)?.group === 'power');
}

// ---------- automatic cable choice ----------

/** Default cable with the highest priority among the chosen connectors (first one wins a tie). */
export function autoCable(connectorIds: string[], data: PriceData): string | null {
  let best: Cable | null = null;
  for (const id of connectorIds) {
    const conn = findConnector(data, id);
    if (!conn) continue;
    const cable = findCable(data, conn.default_cable);
    if (!cable || !cable.active) continue;
    if (!best || cable.priority > best.priority) best = cable;
  }
  return best ? best.id : null;
}

// ---------- pricing one cable ----------

export function isLooseConnector(spec: Pick<CableSpec, 'cableId'>): boolean {
  return spec.cableId === NO_CABLE;
}

/** Price and Tally name of one connector at a tier, or null if that tier isn't available. */
function connectorAt(conn: Connector, tier: Tier): { price: number; name: string } | null {
  const pick = (price: number | null, name: string) => (price === null ? null : { price, name });
  switch (tier) {
    case 'metal':
      return pick(conn.metal_price, conn.metal_tally_name);
    case 'generic':
      return pick(conn.generic_metal_price, conn.generic_metal_tally_name);
    case 'plastic':
      return pick(conn.plastic_price, conn.plastic_tally_name);
    case 'standard':
      // single PRICE card: Neutrik/metal price, falling back to generic metal
      return pick(conn.metal_price, conn.metal_tally_name) ?? pick(conn.generic_metal_price, conn.generic_metal_tally_name);
  }
}

/** Components of one cable at a tier, or null if the tier isn't available / data missing. */
export function buildParts(spec: CableSpec, tier: Tier, data: PriceData): Part[] | null {
  const loose = isLooseConnector(spec);
  const cable = loose ? null : findCable(data, spec.cableId);
  if (!loose && (!cable || !(spec.lengthM > 0))) return null;
  const ids = allConnectorIds(spec);
  if (loose && ids.length === 0) return null;
  const parts: Part[] = [];
  for (const id of ids) {
    const conn = findConnector(data, id);
    if (!conn) return null;
    const at = connectorAt(conn, tier);
    if (!at) return null;
    parts.push({ name: at.name, unit: 'pcs', qty: 1, rate: at.price });
  }
  if (cable) parts.push({ name: cable.tally_name, unit: 'm', qty: spec.lengthM, rate: cable.roll_price_100m / 100 });
  return parts;
}

/** Soldering points: every connector on a cable. Loose connectors (no cable) aren't soldered. */
export function pointsOf(spec: Pick<CableSpec, 'endA' | 'endB' | 'cableId'>): number {
  return isLooseConnector(spec) ? 0 : allConnectorIds(spec).length;
}

export function serviceCharge(points: number, rate: number, gst: number): number {
  return points * rate * (1 + gst);
}

export function unitPrice(spec: CableSpec, tier: Tier, data: PriceData): number | null {
  const parts = buildParts(spec, tier, data);
  if (!parts) return null;
  const s = data.settings;
  const goods = parts.reduce((sum, p) => sum + p.qty * p.rate, 0);
  return goods + serviceCharge(pointsOf(spec), s.service_charge_per_point, s.gst_rate);
}

export interface Quote {
  single: boolean;
  metal: number | null;
  generic: number | null;
  plastic: number | null;
  standard: number | null;
}

export function quote(spec: CableSpec, data: PriceData): Quote {
  if (isSingleMode(spec, data)) {
    return { single: true, metal: null, generic: null, plastic: null, standard: unitPrice(spec, 'standard', data) };
  }
  return {
    single: false,
    metal: unitPrice(spec, 'metal', data),
    generic: unitPrice(spec, 'generic', data),
    plastic: unitPrice(spec, 'plastic', data),
    standard: null,
  };
}

// ---------- cart ----------

export function fmtLength(m: number): string {
  return String(Number(m.toPrecision(10)));
}

function endLabel(ids: string[], data: PriceData): string {
  if (ids.length === 0) return 'Loose';
  return ids.map((id) => findConnector(data, id)?.label ?? id).join(' + ');
}

export function cableTitle(spec: CableSpec, data: PriceData): string {
  if (isLooseConnector(spec)) {
    return `${allConnectorIds(spec).map((id) => findConnector(data, id)?.label ?? id).join(' + ')} (loose)`;
  }
  const len = `${fmtLength(spec.lengthM)}m`;
  if (spec.endA.length === 0 && spec.endB.length === 0) {
    const cable = findCable(data, spec.cableId);
    return `${len} ${cable?.label ?? spec.cableId} (loose)`;
  }
  return `${len} ${endLabel(spec.endA, data)} – ${endLabel(spec.endB, data)}`;
}

const TIER_LABELS: Record<Tier, string> = {
  metal: 'Neutrik',
  generic: 'Generic metal',
  plastic: 'Generic plastic',
  standard: 'Standard',
};

export function tierLabel(tier: Tier): string {
  return TIER_LABELS[tier] ?? tier;
}

/** Snapshot a cable into a cart line. Everything needed later is copied, so price refreshes don't affect it. */
export function makeCartLine(spec: CableSpec, tier: Tier, data: PriceData, id: string): CartLine | null {
  const parts = buildParts(spec, tier, data);
  const price = unitPrice(spec, tier, data);
  if (!parts || price === null) return null;
  return {
    id,
    spec: { endA: [...spec.endA], endB: [...spec.endB], cableId: spec.cableId, lengthM: spec.lengthM },
    tier,
    title: cableTitle(spec, data),
    unitPrice: price,
    qty: 1,
    parts,
    points: pointsOf(spec),
    serviceRate: data.settings.service_charge_per_point,
    gstRate: data.settings.gst_rate,
  };
}

export function sameCable(a: CartLine, b: CartLine): boolean {
  return (
    a.tier === b.tier &&
    a.spec.cableId === b.spec.cableId &&
    a.spec.lengthM === b.spec.lengthM &&
    a.spec.endA.join('|') === b.spec.endA.join('|') &&
    a.spec.endB.join('|') === b.spec.endB.join('|')
  );
}

/** Add a line, merging into an identical existing line (quantity +1, keeps the existing locked price). */
export function addToCart(cart: CartLine[], line: CartLine): CartLine[] {
  const i = cart.findIndex((l) => sameCable(l, line));
  if (i >= 0) return cart.map((l, j) => (j === i ? { ...l, qty: l.qty + line.qty } : l));
  return [...cart, line];
}

export function lineTotal(line: CartLine): number {
  return line.unitPrice * line.qty;
}

export function orderTotal(cart: CartLine[]): number {
  return cart.reduce((s, l) => s + lineTotal(l), 0);
}

// ---------- consolidation ----------

export interface ConsolidatedItem {
  name: string;
  unit: 'pcs' | 'm';
  qty: number;
  rate: number;
  amount: number;
}

export interface ServiceBlock {
  points: number;
  rate: number;
  gst: number;
  base: number;
  gstAmount: number;
  total: number;
}

export interface Consolidated {
  items: ConsolidatedItem[];
  service: ServiceBlock[];
  total: number;
}

export function consolidate(cart: CartLine[]): Consolidated {
  const items: ConsolidatedItem[] = [];
  const service: ServiceBlock[] = [];
  for (const line of cart) {
    for (const p of line.parts) {
      const qty = p.qty * line.qty;
      const found = items.find((it) => it.name === p.name && it.unit === p.unit && it.rate === p.rate);
      if (found) found.qty = cleanNum(found.qty + qty);
      else items.push({ name: p.name, unit: p.unit, qty: cleanNum(qty), rate: p.rate, amount: 0 });
    }
    const pts = line.points * line.qty;
    if (pts > 0) {
      const s = service.find((b) => b.rate === line.serviceRate && b.gst === line.gstRate);
      if (s) s.points += pts;
      else service.push({ points: pts, rate: line.serviceRate, gst: line.gstRate, base: 0, gstAmount: 0, total: 0 });
    }
  }
  for (const it of items) it.amount = it.qty * it.rate;
  for (const s of service) {
    s.base = s.points * s.rate;
    s.gstAmount = s.base * s.gst;
    s.total = s.base + s.gstAmount;
  }
  return { items, service, total: orderTotal(cart) };
}

function cleanNum(x: number): number {
  return Number(x.toPrecision(12));
}

// ---------- formatting ----------

/** Round to 2 decimals, immune to binary float artefacts (245.735 → 245.74). */
export function round2(x: number): number {
  return Math.round(Number((x * 100).toPrecision(12))) / 100;
}

export function roundRupee(x: number): number {
  return Math.round(Number(x.toPrecision(12)));
}

/** ₹1,711.89 */
export function inr2(x: number): string {
  return '₹' + round2(x).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** ₹5,202 */
export function inr0(x: number): string {
  return '₹' + roundRupee(x).toLocaleString('en-IN');
}

/** ₹100 for whole numbers, ₹100.50 otherwise. */
export function inrShort(x: number): string {
  return Number.isInteger(round2(x)) ? inr0(x) : inr2(x);
}

export function pct(rate: number): string {
  return `${Number((rate * 100).toPrecision(10))}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** d MMM yyyy, h:mm a → "15 Nov 2026, 2:17 pm" (device local time). */
export function fmtDateTime(d: Date): string {
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${mm} ${h24 < 12 ? 'am' : 'pm'}`;
}

export function itemQtyText(it: ConsolidatedItem): string {
  return `${fmtLength(it.qty)} ${it.unit}`;
}

export function serviceLines(s: ServiceBlock): [string, string] {
  return [
    `${s.points} pts × ${inrShort(s.rate)} = ${inr2(s.base)}`,
    `${inr2(s.base)} + ${pct(s.gst)} GST (${inr2(s.gstAmount)}) = ${inr2(s.total)}`,
  ];
}

export function formatMessage(
  cart: CartLine[],
  customer: string,
  phone: string,
  businessName: string,
  date: Date,
): string {
  const c = consolidate(cart);
  const name = customer.trim();
  const tel = phone.trim();
  const out: string[] = [];
  out.push(`${businessName.trim().toUpperCase()} – Cable order`);
  out.push(`Customer: ${name}${tel ? ` (${tel})` : ''}`);
  out.push(fmtDateTime(date));
  out.push('');
  for (const it of c.items) {
    out.push(it.name);
    out.push(`${itemQtyText(it)} × ${inr2(it.rate)} = ${inr2(it.amount)}`);
  }
  for (const s of c.service) {
    out.push('SERVICE CHARGE');
    out.push(...serviceLines(s));
  }
  out.push('');
  out.push(`TOTAL: ${inr0(c.total)}`);
  return out.join('\n');
}

export function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
