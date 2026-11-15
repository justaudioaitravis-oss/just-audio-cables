# Decisions

One line each: decision — why.

## Data
- Jack TRS plastic copies the mono jack price (₹250) — no separate plastic TRS price on the site.
- EP plastic uses the site's generic "EP connector" price (₹180) — closest listed item.
- Metal RCA is Amphenol (AMPHENOL ACPR, ₹290) — no Neutrik RCA is listed.
- Speakon / PowerCON default to the mic cable — placeholder until the owner sets real cables (`confirmed = FALSE`).
- Bundled CSVs in `public/data/` are imported into the JS bundle at build time (`?raw`) — prices are available instantly on first launch, even before any network request.
- Sheet validation also accepts "₹" and thousands separators in numbers, a BOM, TRUE/FALSE/YES/NO/1/0, and blank `active`/`confirmed` (= TRUE) — owners often format cells in Google Sheets.
- `plastic_tally_name` is only required when `plastic_price` is filled — no plastic price means no plastic item is ever sent.
- `accountant_whatsapp` has everything except digits stripped (so "+91 98220 12345" also works).
- `gst_rate` outside 0–1 is rejected — guards against someone typing 18 instead of 0.18.
- Vite env vars `VITE_SHEET_CONNECTORS/CABLES/SETTINGS`, when set, override the links in `src/config.ts` — only the e2e build sets them (fake sheet), so tests never touch the real sheet; normal builds use `config.ts`.
- Background refresh runs on launch, when the phone comes back online, and when the app is reopened after 30+ minutes — "next time the app opens online".

## Pricing
- Consolidated items are grouped by Tally name + unit + rate — a locked older price for the same item stays a separate row, so amounts always add up to the total.
- Service charge blocks are grouped by (rate, GST) for the same reason; normally there is exactly one.
- A cart line stores a full snapshot (title, parts, rates, points, service rate, GST) — price lock covers the summary and message too, not just the unit price.
- Merging into an existing cart line keeps that line's locked price.
- Auto cable tie-break: among equal priorities, the first chosen connector (End A first) wins.
- Auto cable ignores a default cable that is inactive.
- Two-decimal amounts are rounded half-up after removing binary float noise (245.735 → ₹245.74).
- Price cards on Build show rounded rupees (₹1,588) — matches example 3 "shown ₹1,588" and the cart.
- Cart title with one None end shows that end as "Loose", e.g. `5m XLR Male – Loose`; both None → `50m Speaker 12 AWG 2-core (loose)` as specified.

## UI
- The second (Y) dropdown keeps its connector if the first one is changed afterwards — it only copies the first connector at the moment Y is turned on.
- A single PRICE card (power / loose) must also be tapped before Proceed; its validation message is "Tap the price" — consistent with Metal/Plastic, and "Pick Metal or Plastic" would be wrong there.
- The Metal/Plastic choice survives field edits as long as that tier stays available; it is cleared if it becomes unavailable or the card layout switches to/from PRICE.
- "Add the customer's name" is shown in the same red message slot above Proceed, and the Customer field gets a red border.
- The Y toggle is removed (not just hidden) when the end is blank/None, so the dropdown uses the full width — cleaner blank screen.
- Viewport uses `maximum-scale=1` — stops iPhone Safari zooming in when a 15 px input is focused.
- The Sent screen header shows just the logo (no back arrow) — the flow ends there; the phone's back button still returns to the Order summary.
- "Send again" / "Copy message" appear on the Sent screen if the app is still in the foreground 2 s after Approve (i.e. WhatsApp apparently didn't open).
- Lighthouse accessibility is 93 rather than 100 only because of `maximum-scale=1` (see above) — kept deliberately; everything else (contrast, labels, names) passes. Performance 100, CLS 0.
- New app versions install themselves (`registerType: autoUpdate`); the page reloads once when an update takes over — the order is saved on every change, so nothing is lost.
- "Review order" stays navy on an empty cart and simply does nothing, as specified (no disabled styling to avoid a grey "hover-like" state).
- The Y split is drawn as a navy corner line from the Y button into the second dropdown instead of a small icon — the small icon was nearly invisible in screenshots.
- Header and footer bars span the full width on tablets; content is centred at max 480 px.
- Settings shows "Built-in prices" when the sheet has never been downloaded, and "Not set" in red when `accountant_whatsapp` is blank (the warning required by 7.4).
- Reopening the app restores the screen it was on (via history state); a screen with nothing to show (e.g. summary of an empty cart) falls back to the previous one.
- Full reset unwinds browser history back to Build, so the back button can't return to a cleared order.
- E2E tests run against a production build with fake sheet links (`.env.e2e` → https://sheet.test/…), intercepted by Playwright; WhatsApp is intercepted with a 204 so the page stays put.

## Update requested by the owner (15 Nov 2026)
- Three tiers replace Metal/Plastic: **Neutrik** (`metal_price`), **Generic metal** (new `generic_metal_price`), **Generic plastic** (`plastic_price`) — the existing `metal_price` column keeps its name so the live sheet doesn't break; the two new columns are optional and are treated as empty if missing.
- `metal_price` may now be blank (no Neutrik version) except for power connectors; each connector needs at least one price; a Tally name is required only for tiers that have a price.
- RCA moved to Generic metal (Amphenol ₹290) with no Neutrik price. No other generic metal prices are known yet — left blank for the owner to fill in, rather than guessed.
- The single PRICE card (power / loose cable) uses the Neutrik price, falling back to generic metal for a connector that has no Neutrik price.
- Internal tier ids stay `metal`/`plastic` (+ new `generic`), so carts saved on phones before the update keep working; only the labels changed.
- Price cards became three full-width rows (label left, price right, radio-style check) — three side-by-side cards would squeeze long prices like ₹12,778 at phone width. Rows are 54 px; price figures 24 px.
- Validation message "Pick Metal or Plastic" became "Pick a price".
- Loose connectors: "No cable" is the last option in the Cable dropdown. It hides Length; price = connectors only; **no service charge** (nothing is soldered). Cart title e.g. `XLR Male + XLR Female (loose)`. Picking a connector afterwards re-applies the automatic cable, like any connector change.
- "No cable" with both ends None has nothing to sell → "Pick a cable". The cable id `no_cable` is reserved in the sheet.
- Loose cable (both ends None) already had no service charge — kept, now covered by a test.
- Double-tap guard: for 350 ms after moving to another screen, that screen ignores taps (CSS `pointer-events: none`). Stops a double-tap on Review order from approving, on Approve from starting a New order, and on Proceed from landing on Review order. Not applied to in-place updates such as the cart steppers.
- Custom length accepts plain decimals only (comma allowed as the decimal mark); "1e2", "-5" and "3m" are refused.
