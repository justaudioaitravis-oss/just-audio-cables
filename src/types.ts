export type Group = 'audio' | 'power' | 'data';

export interface Connector {
  id: string;
  label: string;
  group: Group;
  metal_price: number;
  plastic_price: number | null;
  metal_tally_name: string;
  plastic_tally_name: string;
  default_cable: string;
  sort: number;
  active: boolean;
  confirmed: boolean;
}

export interface Cable {
  id: string;
  label: string;
  roll_price_100m: number;
  tally_name: string;
  priority: number;
  sort: number;
  active: boolean;
  confirmed: boolean;
}

export interface Settings {
  service_charge_per_point: number;
  gst_rate: number;
  accountant_whatsapp: string;
  business_name: string;
}

export interface PriceData {
  connectors: Connector[];
  cables: Cable[];
  settings: Settings;
}

/** Metal / Plastic for normal audio cables; Standard for power or loose cable (single PRICE card). */
export type Tier = 'metal' | 'plastic' | 'standard';

/** One cable to be priced. An end is a list of connector ids: [] = None, 1 = single, 2 = Y split. */
export interface CableSpec {
  endA: string[];
  endB: string[];
  cableId: string;
  lengthM: number;
}

/** One component of a priced cable, as it will appear in the accountant's list. */
export interface Part {
  name: string; // Tally name
  unit: 'pcs' | 'm';
  qty: number; // per one cable
  rate: number; // ₹ per pc or per metre (full precision)
}

export interface CartLine {
  id: string;
  spec: CableSpec;
  tier: Tier;
  title: string;
  unitPrice: number; // locked at the time it was added
  qty: number;
  parts: Part[];
  points: number;
  serviceRate: number;
  gstRate: number;
}
