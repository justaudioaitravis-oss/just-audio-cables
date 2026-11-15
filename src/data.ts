// Loading, validating and caching the price sheet.
import Papa from 'papaparse';
import type { Cable, Connector, Group, PriceData, Settings } from './types';
import { SHEET_CSV } from './config';
import { storage } from './storage';
import defaultConnectors from '../public/data/connectors.csv?raw';
import defaultCables from '../public/data/cables.csv?raw';
import defaultSettings from '../public/data/settings.csv?raw';

export interface RawCsv {
  connectors: string;
  cables: string;
  settings: string;
}

export const BUNDLED: RawCsv = {
  connectors: defaultConnectors,
  cables: defaultCables,
  settings: defaultSettings,
};

export class DataError extends Error {}

type Row = Record<string, string>;

function parseRows(text: string, tab: string, required: string[]): Row[] {
  const res = Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  const fields = res.meta.fields ?? [];
  const missing = required.filter((c) => !fields.includes(c));
  if (missing.length) throw new DataError(`${tab}: missing column ${missing.join(', ')}`);
  return res.data.filter((r) => Object.values(r).some((v) => v !== '' && v !== undefined));
}

function num(v: string | undefined, where: string): number {
  const s = (v ?? '').replace(/[₹,\s]/g, '');
  const n = Number(s);
  if (s === '' || !Number.isFinite(n)) throw new DataError(`${where}: "${v ?? ''}" is not a number`);
  return n;
}

function optNum(v: string | undefined, where: string): number | null {
  return (v ?? '').trim() === '' ? null : num(v, where);
}

function bool(v: string | undefined, where: string, dflt: boolean): boolean {
  const s = (v ?? '').trim().toUpperCase();
  if (s === '') return dflt;
  if (['TRUE', 'YES', 'Y', '1'].includes(s)) return true;
  if (['FALSE', 'NO', 'N', '0'].includes(s)) return false;
  throw new DataError(`${where}: "${v}" should be TRUE or FALSE`);
}

function text(v: string | undefined, where: string): string {
  const s = (v ?? '').trim();
  if (!s) throw new DataError(`${where}: empty`);
  return s;
}

const CONNECTOR_COLS = [
  'id', 'label', 'group', 'metal_price', 'plastic_price', 'metal_tally_name',
  'plastic_tally_name', 'default_cable', 'sort', 'active', 'confirmed',
];
const CABLE_COLS = ['id', 'label', 'roll_price_100m', 'tally_name', 'priority', 'sort', 'active', 'confirmed'];

function uniqueIds(rows: { id: string }[], tab: string): void {
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) throw new DataError(`${tab}: id "${r.id}" is used twice`);
    seen.add(r.id);
  }
}

export function parseConnectors(csv: string): Connector[] {
  const rows = parseRows(csv, 'Connectors', CONNECTOR_COLS);
  const list = rows.map((r, i): Connector => {
    const at = `Connectors row ${i + 2}`;
    const id = text(r.id, `${at} id`);
    const group = (r.group ?? '').trim().toLowerCase();
    if (!['audio', 'power', 'data'].includes(group)) {
      throw new DataError(`${at} group: "${r.group ?? ''}" should be audio, power or data`);
    }
    const plastic = optNum(r.plastic_price, `${at} plastic_price`);
    return {
      id,
      label: text(r.label, `${at} label`),
      group: group as Group,
      metal_price: num(r.metal_price, `${at} metal_price`),
      plastic_price: plastic,
      metal_tally_name: text(r.metal_tally_name, `${at} metal_tally_name`),
      plastic_tally_name: plastic === null ? (r.plastic_tally_name ?? '') : text(r.plastic_tally_name, `${at} plastic_tally_name`),
      default_cable: text(r.default_cable, `${at} default_cable`),
      sort: num(r.sort, `${at} sort`),
      active: bool(r.active, `${at} active`, true),
      confirmed: bool(r.confirmed, `${at} confirmed`, true),
    };
  });
  if (list.length === 0) throw new DataError('Connectors: no rows');
  uniqueIds(list, 'Connectors');
  return list;
}

export function parseCables(csv: string): Cable[] {
  const rows = parseRows(csv, 'Cables', CABLE_COLS);
  const list = rows.map((r, i): Cable => {
    const at = `Cables row ${i + 2}`;
    return {
      id: text(r.id, `${at} id`),
      label: text(r.label, `${at} label`),
      roll_price_100m: num(r.roll_price_100m, `${at} roll_price_100m`),
      tally_name: text(r.tally_name, `${at} tally_name`),
      priority: num(r.priority, `${at} priority`),
      sort: num(r.sort, `${at} sort`),
      active: bool(r.active, `${at} active`, true),
      confirmed: bool(r.confirmed, `${at} confirmed`, true),
    };
  });
  if (list.length === 0) throw new DataError('Cables: no rows');
  uniqueIds(list, 'Cables');
  return list;
}

export function parseSettings(csv: string): Settings {
  const rows = parseRows(csv, 'Settings', ['key', 'value']);
  const map = new Map<string, string>();
  for (const r of rows) map.set((r.key ?? '').trim().toLowerCase(), (r.value ?? '').trim());
  const need = (k: string) => {
    if (!map.has(k)) throw new DataError(`Settings: missing ${k}`);
    return map.get(k) ?? '';
  };
  const gst = num(need('gst_rate'), 'Settings gst_rate');
  if (gst < 0 || gst > 1) throw new DataError('Settings gst_rate: use a decimal like 0.18');
  return {
    service_charge_per_point: num(need('service_charge_per_point'), 'Settings service_charge_per_point'),
    gst_rate: gst,
    accountant_whatsapp: (map.get('accountant_whatsapp') ?? '').replace(/\D/g, ''),
    business_name: map.get('business_name') || 'Just Audio',
  };
}

/** Parse and validate all three tabs. Throws DataError with a short reason on any problem. */
export function parseAll(raw: RawCsv): PriceData {
  const connectors = parseConnectors(raw.connectors);
  const cables = parseCables(raw.cables);
  const settings = parseSettings(raw.settings);
  const cableIds = new Set(cables.map((c) => c.id));
  for (const c of connectors) {
    if (!cableIds.has(c.default_cable)) {
      throw new DataError(`Connectors "${c.id}": default_cable "${c.default_cable}" is not in Cables`);
    }
  }
  return { connectors, cables, settings };
}

export function activeConnectors(d: PriceData): Connector[] {
  return d.connectors.filter((c) => c.active).sort((a, b) => a.sort - b.sort);
}

export function activeCables(d: PriceData): Cable[] {
  return d.cables.filter((c) => c.active).sort((a, b) => a.sort - b.sort);
}

// ---------- cache ----------

const CACHE_KEY = 'ja.prices.v1';
const META_KEY = 'ja.prices.meta.v1';

export interface DataMeta {
  updatedAt: number | null; // last successful sheet fetch
  lastError: string | null;
  lastErrorAt: number | null;
}

export function readMeta(): DataMeta {
  const m = storage.getJSON<Partial<DataMeta>>(META_KEY);
  return { updatedAt: m?.updatedAt ?? null, lastError: m?.lastError ?? null, lastErrorAt: m?.lastErrorAt ?? null };
}

function writeMeta(m: DataMeta): void {
  storage.setJSON(META_KEY, m);
}

/** Cached sheet data if present and valid, else the bundled defaults. Never throws. */
export function loadInitial(): PriceData {
  const cached = storage.getJSON<RawCsv>(CACHE_KEY);
  if (cached && typeof cached.connectors === 'string') {
    try {
      return parseAll(cached);
    } catch {
      /* fall through to bundled */
    }
  }
  return parseAll(BUNDLED);
}

export function sheetUrls(): RawCsv {
  const env = import.meta.env;
  return {
    connectors: SHEET_CSV.connectors || env.VITE_SHEET_CONNECTORS || '',
    cables: SHEET_CSV.cables || env.VITE_SHEET_CABLES || '',
    settings: SHEET_CSV.settings || env.VITE_SHEET_SETTINGS || '',
  };
}

export function sheetConfigured(): boolean {
  const u = sheetUrls();
  return Boolean(u.connectors && u.cables && u.settings);
}

async function fetchText(url: string, fetcher: typeof fetch): Promise<string> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetcher(`${url}${sep}_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new DataError(`Download failed (${res.status})`);
  return res.text();
}

export type RefreshResult = { ok: true; data: PriceData } | { ok: false; error: string };

/** Fetch the sheet, validate, and replace the cache. On failure keep the old data and record the error. */
export async function refresh(fetcher: typeof fetch = fetch, now = Date.now()): Promise<RefreshResult> {
  const urls = sheetUrls();
  const meta = readMeta();
  if (!sheetConfigured()) {
    const error = 'Sheet links are not set in src/config.ts';
    writeMeta({ ...meta, lastError: error, lastErrorAt: now });
    return { ok: false, error };
  }
  try {
    const [connectors, cables, settings] = await Promise.all([
      fetchText(urls.connectors, fetcher),
      fetchText(urls.cables, fetcher),
      fetchText(urls.settings, fetcher),
    ]);
    const raw = { connectors, cables, settings };
    const data = parseAll(raw);
    storage.setJSON(CACHE_KEY, raw);
    writeMeta({ updatedAt: now, lastError: null, lastErrorAt: null });
    return { ok: true, data };
  } catch (e) {
    const error =
      e instanceof DataError ? e.message : navigator.onLine === false ? 'Offline' : 'Could not download the sheet';
    writeMeta({ ...meta, lastError: error, lastErrorAt: now });
    return { ok: false, error };
  }
}
