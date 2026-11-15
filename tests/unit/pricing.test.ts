import { describe, expect, it } from 'vitest';
import { BUNDLED, parseAll } from '../../src/data';
import {
  addToCart,
  autoCable,
  cableTitle,
  consolidate,
  fmtDateTime,
  formatMessage,
  inr0,
  inr2,
  isSingleMode,
  makeCartLine,
  NO_CABLE,
  tierLabel,
  orderTotal,
  quote,
  unitPrice,
  whatsappUrl,
} from '../../src/pricing';
import type { CableSpec, CartLine, PriceData, Tier } from '../../src/types';

const data: PriceData = parseAll(BUNDLED);

const spec = (endA: string[], endB: string[], cableId: string, lengthM: number): CableSpec => ({
  endA,
  endB,
  cableId,
  lengthM,
});

let n = 0;
const line = (s: CableSpec, tier: Tier): CartLine => {
  const l = makeCartLine(s, tier, data, `l${n++}`);
  if (!l) throw new Error('could not price');
  return l;
};

const ex1 = spec(['xlr_m'], ['xlr_f'], 'mic', 10);
const ex3 = spec(['ep'], ['ep'], 'slim', 5);
const ex4 = spec(['jack_ts', 'jack_ts'], ['jack_trs'], 'mic', 3);
const ex5 = spec(['xlr_m', 'xlr_f'], ['jack_trs'], 'mic', 3);
const ex6 = spec([], [], 'spk_12_2', 50);

describe('worked examples (section 4)', () => {
  it('#1 10 m XLR M → XLR F, Metal, mic = 1,937.30', () => {
    expect(unitPrice(ex1, 'metal', data)).toBeCloseTo(1937.3, 9);
  });
  it('#2 same, Plastic = 1,280.30', () => {
    expect(unitPrice(ex1, 'plastic', data)).toBeCloseTo(1280.3, 9);
  });
  it('#3 5 m EP → EP, Metal, slim = 1,587.735 (shown ₹1,588)', () => {
    const p = unitPrice(ex3, 'metal', data)!;
    expect(p).toBeCloseTo(1587.735, 9);
    expect(inr0(p)).toBe('₹1,588');
  });
  it('#4 3 m Y(Jack TS + Jack TS) → Jack TRS, Plastic, mic = 1,327.29', () => {
    expect(unitPrice(ex4, 'plastic', data)).toBeCloseTo(1327.29, 9);
  });
  it('#5 3 m Y(XLR M + XLR F) → Jack TRS, Metal, mic = 2,044.29', () => {
    expect(unitPrice(ex5, 'metal', data)).toBeCloseTo(2044.29, 9);
  });
  it('#6 50 m None → None, Speaker 12 AWG 2-core = 12,778.00, no service', () => {
    const q = quote(ex6, data);
    expect(q.single).toBe(true);
    expect(q.standard).toBeCloseTo(12778, 9);
    expect(q.metal).toBeNull();
    expect(q.plastic).toBeNull();
  });
  it('#7 order 2 × #1 + 1 × #4 = 5,201.89 → ₹5,202', () => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, line(ex1, 'metal'));
    cart = addToCart(cart, line(ex1, 'metal'));
    cart = addToCart(cart, line(ex4, 'plastic'));
    expect(cart).toHaveLength(2);
    expect(cart[0].qty).toBe(2);
    expect(orderTotal(cart)).toBeCloseTo(5201.89, 9);
    expect(inr0(orderTotal(cart))).toBe('₹5,202');
  });
});

describe('tiers', () => {
  it('quotes both Metal and Plastic for an audio cable', () => {
    const q = quote(ex1, data);
    expect(q.single).toBe(false);
    expect(q.metal).toBeCloseTo(1937.3, 9);
    expect(q.plastic).toBeCloseTo(1280.3, 9);
  });
  it('a connector without a plastic price disables Plastic', () => {
    const q = quote(spec(['speakon_8'], ['speakon_8'], 'spk_12_4', 5), data);
    expect(q.single).toBe(false);
    expect(q.metal).not.toBeNull();
    expect(q.plastic).toBeNull();
  });
  it('a mix where only one connector lacks plastic still disables Plastic', () => {
    expect(quote(spec(['xlr_m'], ['ethercon'], 'mic', 2), data).plastic).toBeNull();
  });
  it('any power connector gives a single Standard price using metal_price', () => {
    const s = spec(['powercon_in'], ['xlr_m'], 'mic', 2);
    expect(isSingleMode(s, data)).toBe(true);
    const q = quote(s, data);
    expect(q.single).toBe(true);
    // 616 + 445 + 74.43*2 + 2*118
    expect(q.standard).toBeCloseTo(616 + 445 + 148.86 + 236, 9);
  });
  it('one None end charges service only for connectors present', () => {
    const s = spec(['xlr_m'], [], 'mic', 2);
    expect(isSingleMode(s, data)).toBe(false);
    expect(unitPrice(s, 'metal', data)).toBeCloseTo(445 + 148.86 + 118, 9);
    expect(unitPrice(s, 'plastic', data)).toBeCloseTo(150 + 148.86 + 118, 9);
  });
  it('returns null without cable or length', () => {
    expect(unitPrice(spec(['xlr_m'], ['xlr_f'], '', 10), 'metal', data)).toBeNull();
    expect(unitPrice(spec(['xlr_m'], ['xlr_f'], 'mic', 0), 'metal', data)).toBeNull();
  });
});

describe('three tiers: Neutrik, Generic metal, Generic plastic', () => {
  it('Neutrik uses metal_price; Generic plastic uses plastic_price', () => {
    const q = quote(ex1, data);
    expect(q.metal).toBeCloseTo(1937.3, 9);
    expect(q.plastic).toBeCloseTo(1280.3, 9);
  });
  it('Generic metal is unavailable when any connector has no generic metal price', () => {
    expect(quote(ex1, data).generic).toBeNull();
  });
  it('RCA: Amphenol is generic metal, and there is no Neutrik version', () => {
    const q = quote(spec(['rca'], ['rca'], 'mic', 2), data);
    // 290×2 + 148.86 + 236
    expect(q.generic).toBeCloseTo(964.86, 9);
    expect(q.metal).toBeNull();
    expect(q.plastic).toBeCloseTo(180 * 2 + 148.86 + 236, 9);
    const l = makeCartLine(spec(['rca'], ['rca'], 'mic', 2), 'generic', data, 'g')!;
    expect(l.parts[0]).toEqual({ name: 'AMPHENOL ACPR', unit: 'pcs', qty: 1, rate: 290 });
  });
  it('generic metal prices filled in the sheet are used', () => {
    const d: PriceData = {
      ...data,
      connectors: data.connectors.map((c) =>
        c.id.startsWith('xlr') ? { ...c, generic_metal_price: 300, generic_metal_tally_name: `AMPHENOL ${c.id}` } : c,
      ),
    };
    expect(quote(ex1, d).generic).toBeCloseTo(300 + 300 + 744.3 + 236, 9);
  });
  it('tier names', () => {
    expect(['metal', 'generic', 'plastic', 'standard'].map((t) => tierLabel(t as Tier))).toEqual([
      'Neutrik',
      'Generic metal',
      'Generic plastic',
      'Standard',
    ]);
  });
});

describe('loose connectors (No cable)', () => {
  const one = spec(['xlr_m'], [], NO_CABLE, 0);
  it('prices the connector only, with no service charge', () => {
    const q = quote(one, data);
    expect(q.single).toBe(false);
    expect(q.metal).toBe(445);
    expect(q.plastic).toBe(150);
  });
  it('a Y pair of loose connectors: both priced, still no service', () => {
    expect(unitPrice(spec(['xlr_m', 'xlr_f'], [], NO_CABLE, 0), 'metal', data)).toBe(957);
  });
  it('a loose power connector uses the single price', () => {
    const q = quote(spec(['bals_32_3_f'], [], NO_CABLE, 0), data);
    expect(q.single).toBe(true);
    expect(q.standard).toBe(1374);
  });
  it('nothing to price when both ends are None', () => {
    expect(unitPrice(spec([], [], NO_CABLE, 0), 'standard', data)).toBeNull();
  });
  it('cart title, consolidation and message have no cable and no service', () => {
    const l = makeCartLine(one, 'metal', data, 'x')!;
    expect(l.title).toBe('XLR Male (loose)');
    expect(l.points).toBe(0);
    const cart = addToCart(addToCart([], l), makeCartLine(one, 'metal', data, 'y')!);
    expect(cart[0].qty).toBe(2);
    const c = consolidate(cart);
    expect(c.items).toEqual([{ name: 'NEUTRIK NC3MXX', unit: 'pcs', qty: 2, rate: 445, amount: 890 }]);
    expect(c.service).toEqual([]);
    expect(formatMessage(cart, 'Ravi', '', 'Just Audio', new Date(2026, 10, 15, 9, 5))).toBe(
      ['JUST AUDIO – Cable order', 'Customer: Ravi', '15 Nov 2026, 9:05 am', '', 'NEUTRIK NC3MXX', '2 pcs × ₹445.00 = ₹890.00', '', 'TOTAL: ₹890'].join('\n'),
    );
  });
  it('loose cable (None → None) also has no service charge', () => {
    expect(makeCartLine(ex6, 'standard', data, 'z')!.points).toBe(0);
  });
});

describe('automatic cable choice', () => {
  it('XLR → XLR picks the mic cable', () => {
    expect(autoCable(['xlr_m', 'xlr_f'], data)).toBe('mic');
  });
  it('picks slim when any end includes EP', () => {
    expect(autoCable(['xlr_m', 'ep'], data)).toBe('slim');
    expect(autoCable(['ep', 'jack_trs'], data)).toBe('slim');
    expect(autoCable(['jack_ts', 'xlr_f', 'ep'], data)).toBe('slim');
  });
  it('higher priority wins (power cable over mic)', () => {
    expect(autoCable(['xlr_m', 'bals_16_3_f'], data)).toBe('power_tbd');
  });
  it('returns null when nothing is chosen', () => {
    expect(autoCable([], data)).toBeNull();
  });
});

describe('cart', () => {
  it('merges identical lines and keeps different ones apart', () => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, line(ex1, 'metal'));
    cart = addToCart(cart, line(ex1, 'plastic'));
    cart = addToCart(cart, line(spec(['xlr_f'], ['xlr_m'], 'mic', 10), 'metal'));
    cart = addToCart(cart, line(spec(['xlr_m'], ['xlr_f'], 'mic', 5), 'metal'));
    cart = addToCart(cart, line(ex1, 'metal'));
    expect(cart.map((l) => l.qty)).toEqual([2, 1, 1, 1]);
  });
  it('keeps the locked price when prices change later', () => {
    const l = line(ex1, 'metal');
    const pricier: PriceData = {
      ...data,
      connectors: data.connectors.map((c) => (c.id === 'xlr_m' ? { ...c, metal_price: 999 } : c)),
    };
    const cart = addToCart([l], makeCartLine(ex1, 'metal', pricier, 'x')!);
    expect(cart).toHaveLength(1);
    expect(cart[0].unitPrice).toBeCloseTo(1937.3, 9);
    expect(orderTotal(cart)).toBeCloseTo(3874.6, 9);
  });
  it('builds cart titles', () => {
    expect(cableTitle(ex1, data)).toBe('10m XLR Male – XLR Female');
    expect(cableTitle(ex5, data)).toBe('3m XLR Male + XLR Female – Jack TRS (stereo)');
    expect(cableTitle(ex6, data)).toBe('50m Speaker 12 AWG 2-core (loose)');
    expect(cableTitle(spec(['xlr_m'], [], 'mic', 0.5), data)).toBe('0.5m XLR Male – Loose');
  });
});

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    expect(inr2(1711.89)).toBe('₹1,711.89');
    expect(inr2(1234567.5)).toBe('₹12,34,567.50');
    expect(inr0(5201.89)).toBe('₹5,202');
    expect(inr0(123456)).toBe('₹1,23,456');
  });
  it('rounds 2-decimal amounts half up despite float error', () => {
    expect(inr2(4914.7 / 100 * 5)).toBe('₹245.74');
  });
  it('formats the date as d MMM yyyy, h:mm a', () => {
    expect(fmtDateTime(new Date(2026, 10, 15, 14, 17))).toBe('15 Nov 2026, 2:17 pm');
    expect(fmtDateTime(new Date(2026, 0, 3, 0, 5))).toBe('3 Jan 2026, 12:05 am');
    expect(fmtDateTime(new Date(2026, 0, 3, 12, 0))).toBe('3 Jan 2026, 12:00 pm');
  });
});

describe('consolidation and accountant message', () => {
  const order = (): CartLine[] => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, line(ex1, 'metal'));
    cart = addToCart(cart, line(ex1, 'metal'));
    cart = addToCart(cart, line(ex4, 'plastic'));
    return cart;
  };

  it('sums identical items in order of first appearance', () => {
    const c = consolidate(order());
    expect(c.items.map((i) => [i.name, i.qty])).toEqual([
      ['NEUTRIK NC3MXX', 2],
      ['NEUTRIK NC3FXX', 2],
      ['KRYSTAL DIGITAL MIC CABLE', 23],
      ['PLASTIC JACK TS', 2],
      ['PLASTIC JACK TRS', 1],
    ]);
    expect(c.service).toHaveLength(1);
    expect(c.service[0].points).toBe(7);
    expect(c.service[0].total).toBeCloseTo(826, 9);
    const sum = c.items.reduce((s, i) => s + i.amount, 0) + c.service[0].total;
    expect(sum).toBeCloseTo(c.total, 9);
  });

  it('example 7 produces exactly the section 7.4 message', () => {
    const msg = formatMessage(order(), 'Ravi', '98220 12345', 'Just Audio', new Date(2026, 10, 15, 14, 17));
    expect(msg).toBe(
      [
        'JUST AUDIO – Cable order',
        'Customer: Ravi (98220 12345)',
        '15 Nov 2026, 2:17 pm',
        '',
        'NEUTRIK NC3MXX',
        '2 pcs × ₹445.00 = ₹890.00',
        'NEUTRIK NC3FXX',
        '2 pcs × ₹512.00 = ₹1,024.00',
        'KRYSTAL DIGITAL MIC CABLE',
        '23 m × ₹74.43 = ₹1,711.89',
        'PLASTIC JACK TS',
        '2 pcs × ₹250.00 = ₹500.00',
        'PLASTIC JACK TRS',
        '1 pcs × ₹250.00 = ₹250.00',
        'SERVICE CHARGE',
        '7 pts × ₹100 = ₹700.00',
        '₹700.00 + 18% GST (₹126.00) = ₹826.00',
        '',
        'TOTAL: ₹5,202',
      ].join('\n'),
    );
  });

  it('omits phone brackets and the service block when not needed', () => {
    const cart = addToCart([], line(ex6, 'standard'));
    const msg = formatMessage(cart, 'Ravi', '', 'Just Audio', new Date(2026, 10, 15, 9, 5));
    expect(msg).toBe(
      [
        'JUST AUDIO – Cable order',
        'Customer: Ravi',
        '15 Nov 2026, 9:05 am',
        '',
        'KRYSTAL SPK 12 AWG 2 CORE',
        '50 m × ₹255.56 = ₹12,778.00',
        '',
        'TOTAL: ₹12,778',
      ].join('\n'),
    );
  });

  it('builds the WhatsApp link, with or without a number', () => {
    expect(whatsappUrl('919822012345', 'a b&c')).toBe('https://wa.me/919822012345?text=a%20b%26c');
    expect(whatsappUrl('', 'hi')).toBe('https://wa.me/?text=hi');
  });
});
