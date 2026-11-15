export type Group = 'audio' | 'power' | 'data';

export interface Connector {
  id: string;
  label: string;
  group: Group;
  /** Neutrik price (power: the single price). null = no Neutrik version. */
  metal_price: number | null;
  /** Generic metal (Amphenol or other non-Neutrik metal). null = not available. */
  generic_metal_price: number | null;
  plastic_price: number | null;
  metal_tally_name: string;
  generic_metal_tally_name: string;
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

/**
 * metal = Neutrik, generic = generic metal (Amphenol etc.), plastic = generic plastic.
 * standard = the single PRICE card (power connectors, or loose cable).
 */
export type Tier = 'metal' | 'generic' | 'plastic' | 'standard';

/**
 * One cable to be priced. An end is a list of connector ids: [] = None, 1 = single, 2 = Y split.
 * cableId = NO_CABLE ('no_cable') means loose connector(s): no cable, no length, no service charge.
 */
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
