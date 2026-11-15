// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { BUNDLED, DataError, activeCables, activeConnectors, loadInitial, parseAll, readMeta, refresh } from '../../src/data';

vi.mock('../../src/config', () => ({
  SHEET_CSV: {
    connectors: 'https://sheet.test/c.csv',
    cables: 'https://sheet.test/k.csv',
    settings: 'https://sheet.test/s.csv',
  },
}));

const raw = { ...BUNDLED };

function fetcherFor(files: Record<string, string>, status = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(files).find((k) => url.includes(k));
    if (!key) return new Response('nope', { status: 404 });
    return new Response(files[key], { status });
  }) as typeof fetch;
}

const files = (over: Partial<typeof raw> = {}) => {
  const r = { ...raw, ...over };
  return { '/c.csv': r.connectors, '/k.csv': r.cables, '/s.csv': r.settings };
};

beforeEach(() => localStorage.clear());

describe('bundled defaults', () => {
  it('are the files in public/data', () => {
    expect(BUNDLED.connectors).toBe(readFileSync('public/data/connectors.csv', 'utf8'));
  });
  it('parse with all rows from the spec', () => {
    const d = parseAll(BUNDLED);
    expect(d.connectors).toHaveLength(23);
    expect(d.cables).toHaveLength(15);
    expect(d.settings).toEqual({
      service_charge_per_point: 100,
      gst_rate: 0.18,
      accountant_whatsapp: '',
      business_name: 'Just Audio',
    });
    const ep = d.connectors.find((c) => c.id === 'ep')!;
    expect(ep).toMatchObject({ metal_price: 553, plastic_price: 180, default_cable: 'slim', confirmed: false });
    expect(d.connectors.find((c) => c.id === 'ethercon')!.plastic_price).toBeNull();
    expect(d.cables.find((c) => c.id === 'slim')!.roll_price_100m).toBe(4914.7);
  });
  it('sort and filter active rows', () => {
    const d = parseAll(BUNDLED);
    d.connectors[0].active = false;
    d.connectors[1].sort = 1;
    const list = activeConnectors(d);
    expect(list[0].id).toBe('xlr_f');
    expect(list.find((c) => c.id === 'xlr_m')).toBeUndefined();
    expect(activeCables(d)[0].id).toBe('mic');
  });
});

describe('validation', () => {
  it('rejects a missing column', () => {
    const bad = raw.cables.replace('priority,', '');
    expect(() => parseAll({ ...raw, cables: bad })).toThrow(/missing column priority/);
  });
  it('rejects a price that is not a number', () => {
    const bad = raw.connectors.replace('xlr_m,XLR Male,audio,445', 'xlr_m,XLR Male,audio,abc');
    expect(() => parseAll({ ...raw, connectors: bad })).toThrow(DataError);
  });
  it('rejects duplicate ids', () => {
    const bad = raw.cables.trimEnd() + '\nmic,Another,1,X,1,1,TRUE,TRUE\n';
    expect(() => parseAll({ ...raw, cables: bad })).toThrow(/used twice/);
  });
  it('rejects an unknown default_cable', () => {
    const bad = raw.connectors.replace(',slim,50,', ',nosuch,50,');
    expect(() => parseAll({ ...raw, connectors: bad })).toThrow(/default_cable "nosuch"/);
  });
  it('accepts ₹ and thousands separators in numbers and a BOM', () => {
    const ok = '﻿' + raw.connectors.replace('bals_63_5_m,Bals 63A 5-pin M,power,9185', 'bals_63_5_m,Bals 63A 5-pin M,power,"₹9,185"');
    const d = parseAll({ ...raw, connectors: ok });
    expect(d.connectors.find((c) => c.id === 'bals_63_5_m')!.metal_price).toBe(9185);
  });
  it('strips non-digits from the accountant number', () => {
    const s = raw.settings.replace('accountant_whatsapp,', 'accountant_whatsapp,+91 98220 12345');
    expect(parseAll({ ...raw, settings: s }).settings.accountant_whatsapp).toBe('919822012345');
  });
});

describe('cache and refresh', () => {
  it('uses bundled data when nothing is cached', () => {
    expect(loadInitial().connectors[0].metal_price).toBe(445);
  });

  it('a good sheet replaces the cache and records the time', async () => {
    const newer = raw.connectors.replace('xlr_m,XLR Male,audio,445', 'xlr_m,XLR Male,audio,460');
    const r = await refresh(fetcherFor(files({ connectors: newer })), 1000);
    expect(r.ok).toBe(true);
    expect(loadInitial().connectors[0].metal_price).toBe(460);
    expect(readMeta()).toEqual({ updatedAt: 1000, lastError: null, lastErrorAt: null });
  });

  it('a bad sheet keeps the previous data and records the error', async () => {
    const newer = raw.connectors.replace('xlr_m,XLR Male,audio,445', 'xlr_m,XLR Male,audio,460');
    await refresh(fetcherFor(files({ connectors: newer })), 1000);
    const broken = raw.connectors.replace('xlr_m,XLR Male,audio,445', 'xlr_m,XLR Male,audio,');
    const r = await refresh(fetcherFor(files({ connectors: broken })), 2000);
    expect(r.ok).toBe(false);
    expect(loadInitial().connectors[0].metal_price).toBe(460);
    const meta = readMeta();
    expect(meta.updatedAt).toBe(1000);
    expect(meta.lastError).toMatch(/metal_price/);
  });

  it('a failed download keeps the previous data', async () => {
    const r = await refresh(fetcherFor(files(), 500), 3000);
    expect(r.ok).toBe(false);
    expect(readMeta().lastError).toMatch(/Download failed/);
    expect(loadInitial().connectors[0].metal_price).toBe(445);
  });

  it('survives a corrupt cache', () => {
    localStorage.setItem('ja.prices.v1', '{not json');
    expect(loadInitial().connectors).toHaveLength(23);
  });
});
