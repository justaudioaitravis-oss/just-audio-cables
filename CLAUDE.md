# Just Audio – Cable Calculator

You are building a complete, finished app **autonomously**. The owner will start you and come back later expecting a working product. Read this whole file before writing any code, then follow **How to work** below until every item in **Definition of done** is true.

---

## 1. What this is

A phone app for **Just Audio** (pro-audio store, Goa, India — justaudioindia.com) that prices custom-made audio and power cables in a few taps.

Staff at the counter:
1. enter the customer, pick the two ends, the cable and the length,
2. read the **Metal** and **Plastic** prices out to the customer,
3. add the chosen cable to a cart, repeat for other cables,
4. review the order, and **Approve**, which sends a consolidated item list to the accountant on WhatsApp for entry into Tally. **Deny** clears the order.

Goal: **employees stop asking the owner for prices.** Every decision favours speed, clarity and simplicity over flexibility. It should be simple enough for anyone to use, and look professional.

---

## 2. How to work (autonomous mode)

- **Do not stop to ask questions.** When something is unclear, choose the simplest reasonable option that fits this spec, write it down in `DECISIONS.md` (one line: decision + why), and continue.
- **Track progress in `PROGRESS.md`.** At the start, copy the milestone checklist from section 12 into it. Tick items as you finish them, and add notes for anything skipped or blocked. Keep it current, because it's the first thing the owner will read.
- **Use git.** `git init` if needed. Commit after each milestone with a clear message. Never rewrite history.
- **Verify as you go.** After each milestone, run `npm run build`, `npm test`, and (once it exists) `npm run test:e2e`. Fix failures before moving on.
- **Check your own UI visually.** Use Playwright to take screenshots at a 390×844 phone viewport of every screen and state (blank Build, filled Build, Y-split on, custom length, cart with items, order summary, deny confirmation, sent screen). Save them to `screenshots/`. Look at each screenshot and compare it against sections 6 and 7. Fix anything cramped, misaligned, low-contrast, invisible-until-hover, or not matching the spec.
- **If stuck** on the same problem after 3 attempts, take a simpler approach, log it in `DECISIONS.md`, and move on.
- **Never change the pricing formula** (section 4) or the worked examples. They come from the owner.
- **Don't add** a backend, login, analytics, trackers, ads, or anything that sends data anywhere except the WhatsApp hand-off and fetching the owner's Google Sheet.
- Things that need the owner's own accounts (creating the Google Sheet, deploying to a host) can't be done by you. Prepare everything so they take minutes, and document the steps in `README.md` (section 11).

---

## 3. Platform and stack

- **PWA** (web app manifest + service worker), installable from a link via "Add to Home Screen" on Android Chrome and iPhone Safari. It opens full-screen (`display: standalone`) with its own icon, named **"Cable Calculator"** (short name "Cables").
- **Works fully offline** after the first load: app shell, fonts, logo, icons and the last price data are all cached.
- **Static files only**, with no server code. It must be deployable to GitHub Pages, Netlify or Cloudflare Pages.
- Stack: **Vite + vanilla TypeScript** (no UI framework needed; Preact is acceptable if it clearly simplifies things). `vite-plugin-pwa` for the service worker. `papaparse` for CSV. **Vitest** for unit tests. **Playwright** for e2e tests and screenshots.
- State lives in `localStorage` (current order, cart, cached prices, last-update time). Wrap all storage access in try/catch.
- Phone portrait first (360–430 px wide). It must still look good on a tablet (center the app at max-width ~480 px).
- Light mode only.

---

## 4. Pricing logic (core — must be exact)

All connector and cable prices in the master sheet are **retail prices that already include GST**. Only the soldering service charge gets GST added.

A cable has **End A** and **End B**. Each end has **1 connector, or 2 when it's split (Y)**. Each connector at an end can be different, e.g. End A = XLR Male + XLR Female, End B = Jack TRS.

For one cable, at the chosen tier (Metal or Plastic):

```
connectors  = Σ price(tier) of every connector on both ends        // 2, 3 or 4 connectors
cable       = (cable roll price for 100 m ÷ 100) × length_m
points      = number of connectors on both ends (a "None" end counts 0)
service     = points × SERVICE_CHARGE_PER_POINT × (1 + GST_RATE)
unit_price  = connectors + cable + service
line_total  = unit_price × quantity
order_total = Σ line_total
```

- `SERVICE_CHARGE_PER_POINT` = 100 and `GST_RATE` = 0.18, both read from the sheet's Settings tab.
- Compute with full precision. **Display:** per-item amounts on the Order summary and in the WhatsApp message use 2 decimals (₹1,711.89). The cart line totals, cart total and order **Total** are **rounded to the nearest rupee** (₹5,202). Use Indian digit grouping (`toLocaleString('en-IN')`).
- **Price lock:** a cart line stores its `unit_price` at the moment it was added. If prices refresh later, existing cart lines keep their price.

### Tiers

- Customers only hear **Metal** or **Plastic**.
  - **Metal** = Neutrik (or whatever the sheet lists in the metal columns).
  - **Plastic** = generic plastic connectors (MMJ / Krystal / Gorizon are treated as one item, one price, no brand shown).
- Both prices are always shown side by side. If **any** connector on the cable has no plastic price (blank in the sheet), the Plastic card shows "—" and can't be selected.
- **Power connectors** (`group = power`: Bals, Camlock, PowerCON, TRUE1) have a single price stored in `metal_price`. If any connector on the cable is a power connector, show **one** full-width card labelled **PRICE** instead of Metal/Plastic. It uses `metal_price` for all connectors, and the cart shows "Standard" as the tier.

### "None" ends (loose cable)

Both End A and End B dropdowns end with a **None** option.
- Both ends None → price = cable × length only, **no service charge**. Show a single **PRICE** card. This is for selling bare cable (e.g. 50 m of 12 AWG 2-core for an install).
- One end None → price that end's connector(s) normally and charge service only for the connectors present.
- The Y toggle is hidden on an end set to None.

### Automatic cable choice

Each connector row has a `default_cable`. Each cable has a `priority`. When connectors change, set the Cable dropdown to the default cable with the **highest priority** among all chosen connectors (ignoring None). Staff can override it in the dropdown, but **any change to a connector re-applies the automatic choice.** If every end is None, leave the cable as it is (or blank if nothing was chosen yet).

### Worked examples (must be unit tests)

| # | Cable (1 piece) | Calculation | Unit price |
|---|---|---|---|
| 1 | 10 m XLR M → XLR F, Metal, mic cable | 445 + 512 + (7443÷100×10 = 744.30) + (2×100×1.18 = 236) | **1,937.30** |
| 2 | Same, Plastic | 150 + 150 + 744.30 + 236 | **1,280.30** |
| 3 | 5 m EP → EP, Metal, slim cable | 553×2 + (4914.70÷100×5 = 245.735) + 236 | **1,587.735** (shown ₹1,588) |
| 4 | 3 m Y(Jack TS + Jack TS) → Jack TRS, Plastic, mic | 250+250+250 + 223.29 + (3×118 = 354) | **1,327.29** |
| 5 | 3 m Y(XLR M + XLR F) → Jack TRS, Metal, mic | 445+512+510 + 223.29 + 354 | **2,044.29** |
| 6 | 50 m None → None, Speaker 12 AWG 2-core | 25556÷100×50 | **12,778.00** (no service) |
| 7 | Order: 2 × #1 + 1 × #4 | 3,874.60 + 1,327.29 | **5,201.89** → Total **₹5,202** |

Also test: auto cable picks slim when any end includes EP; a plastic-unavailable connector disables Plastic; merging identical cart lines; consolidation in the accountant message (example 7 must produce exactly the message in section 7.4).

---

## 5. Price data — the master sheet

The owner edits a **Google Sheet** with three tabs: `Connectors`, `Cables`, `Settings`. Each tab is published as CSV (File → Share → Publish to web → choose tab → CSV). The three CSV URLs go in `src/config.ts`:

```ts
export const SHEET_CSV = {
  connectors: '',  // owner pastes URL
  cables: '',
  settings: '',
};
```

**Loading rules**
1. On launch, show cached prices immediately (or bundled defaults if there's no cache).
2. If online and the URLs are set, fetch all three CSVs in the background, validate them (required columns present, numbers parse, ids unique, every `default_cable` exists), then replace the cache and store the timestamp. Update dropdowns without losing the user's current selections, where those ids still exist.
3. If a fetch or validation fails, keep the previous data and record the error, which shows in Settings.
4. **Bundled defaults** live in `public/data/connectors.csv`, `cables.csv` and `settings.csv`, in exactly the sheet format, generated from the tables below. They are also what the owner imports to create the sheet.
5. Everything is data-driven: dropdown labels, order, Tally names, prices, default cables, service charge, GST and the accountant number. New rows appear automatically. Nothing price- or name-related is hard-coded in TypeScript.

### Tab `Connectors`

| column | meaning |
|---|---|
| `id` | short stable key, e.g. `xlr_m` |
| `label` | shown in dropdowns, e.g. `XLR Male` |
| `group` | `audio`, `power` or `data` |
| `metal_price` | ₹ incl. GST. For `power`, the single price |
| `plastic_price` | ₹ incl. GST. Blank = not available |
| `metal_tally_name` | name sent to the accountant |
| `plastic_tally_name` | name sent to the accountant |
| `default_cable` | an `id` from Cables |
| `sort` | order in dropdowns (ascending) |
| `active` | FALSE hides it from dropdowns |
| `confirmed` | FALSE = placeholder the owner still has to check (no UI effect except Settings list) |

### Tab `Cables`

| column | meaning |
|---|---|
| `id` | e.g. `mic` |
| `label` | e.g. `Digital mic cable` |
| `roll_price_100m` | ₹ incl. GST for a 100 m roll |
| `tally_name` | name sent to the accountant |
| `priority` | higher wins in automatic cable choice |
| `sort` | order in the Cable dropdown |
| `active` | FALSE hides it |
| `confirmed` | as above |

### Tab `Settings` (two columns: `key`, `value`)

| key | default |
|---|---|
| `service_charge_per_point` | 100 |
| `gst_rate` | 0.18 |
| `accountant_whatsapp` | *(blank. Owner fills it in, digits only with country code, e.g. 919822012345)* |
| `business_name` | Just Audio |

### Default data (from justaudioindia.com, Nov 2026, prices incl. GST)

**Connectors**

| id | label | group | metal_price | plastic_price | metal_tally_name | plastic_tally_name | default_cable | sort | confirmed |
|---|---|---|---|---|---|---|---|---|---|
| xlr_m | XLR Male | audio | 445 | 150 | NEUTRIK NC3MXX | PLASTIC XLR MALE | mic | 10 | TRUE |
| xlr_f | XLR Female | audio | 512 | 150 | NEUTRIK NC3FXX | PLASTIC XLR FEMALE | mic | 20 | TRUE |
| jack_ts | Jack TS (mono) | audio | 445 | 250 | NEUTRIK NP2X | PLASTIC JACK TS | mic | 30 | TRUE |
| jack_trs | Jack TRS (stereo) | audio | 510 | 250 | NEUTRIK NP3X | PLASTIC JACK TRS | mic | 40 | FALSE |
| ep | EP | audio | 553 | 180 | NEUTRIK NTP3RC | PLASTIC EP | slim | 50 | FALSE |
| speakon | Speakon | audio | 575 | 200 | NEUTRIK NL4FX | PLASTIC SPEAKON | mic | 60 | FALSE |
| rca | RCA | audio | 290 | 180 | AMPHENOL ACPR | PLASTIC RCA | mic | 70 | FALSE |
| speakon_8 | Speakon 8-pole | audio | 1628 | | NEUTRIK NL8FC | | spk_12_4 | 80 | FALSE |
| ethercon | EtherCON | data | 425 | | NEUTRIK NE8MX | | cat_tbd | 90 | FALSE |
| powercon_in | PowerCON (in) | power | 616 | | NEUTRIK NAC3FCA | | mic | 100 | FALSE |
| powercon_out | PowerCON (out) | power | 642 | | NEUTRIK NAC3FCB | | mic | 110 | FALSE |
| true1_f | PowerCON TRUE1 F | power | 900 | | NEUTRIK NAC3F TRUE1 | | power_tbd | 120 | FALSE |
| true1_m | PowerCON TRUE1 M | power | 1000 | | NEUTRIK NAC3M TRUE1 | | power_tbd | 130 | FALSE |
| bals_16_3_f | Bals 16A 3-pin F | power | 807 | | BALS 16A 3PIN FEMALE PM | | power_tbd | 140 | FALSE |
| bals_16_3_m | Bals 16A 3-pin M | power | 1322 | | BALS 16A 3PIN MALE PM | | power_tbd | 150 | FALSE |
| bals_32_3_f | Bals 32A 3-pin F | power | 1374 | | BALS 32A 3PIN FEMALE PM | | power_tbd | 160 | FALSE |
| bals_32_3_m | Bals 32A 3-pin M | power | 1850 | | BALS 32A 3PIN MALE PM | | power_tbd | 170 | FALSE |
| bals_32_5_f | Bals 32A 5-pin F | power | 1614 | | BALS 32A 5PIN FEMALE PM | | power_tbd | 180 | FALSE |
| bals_32_5_m | Bals 32A 5-pin M | power | 2063 | | BALS 32A 5PIN MALE PM | | power_tbd | 190 | FALSE |
| bals_63_5_f | Bals 63A 5-pin F | power | 5739 | | BALS 63A 5PIN FEMALE PM | | power_tbd | 200 | FALSE |
| bals_63_5_m | Bals 63A 5-pin M | power | 9185 | | BALS 63A 5PIN MALE PM | | power_tbd | 210 | FALSE |
| camlock_p | Camlock (P) | power | 991 | | CAMLOCK PP200P | | power_tbd | 220 | FALSE |
| camlock_c | Camlock (C) | power | 991 | | CAMLOCK PP200C | | power_tbd | 230 | FALSE |

All `active = TRUE`. Notes for `DECISIONS.md`: Jack TRS plastic copies the mono jack price; EP plastic uses the site's generic "EP connector" price (₹180); metal RCA is Amphenol (no Neutrik RCA is listed); Speakon/PowerCON default to mic cable as a placeholder.

**Cables**

| id | label | roll_price_100m | tally_name | priority | sort | confirmed |
|---|---|---|---|---|---|---|
| mic | Digital mic cable | 7443.00 | KRYSTAL DIGITAL MIC CABLE | 10 | 10 | TRUE |
| slim | Slim digital cable | 4914.70 | KRYSTAL SLIM DIGITAL CABLE | 20 | 20 | TRUE |
| snake_4 | 4-pair snake | 22889.00 | KRYSTAL 4 PAIR SNAKE DIGITAL CABLE | 5 | 30 | TRUE |
| snake_8 | 8-pair snake | 42547.00 | KRYSTAL 8 PAIR SNAKE DIGITAL CABLE | 5 | 40 | TRUE |
| snake_12 | 12-pair snake | 62627.15 | KRYSTAL 12 PAIR SNAKE DIGITAL CABLE | 5 | 50 | TRUE |
| spk_10_2 | Speaker 10 AWG 2-core | 35807.00 | KRYSTAL 10 AWG 2 CORE | 5 | 60 | TRUE |
| spk_10_4 | Speaker 10 AWG 4-core | 68946.00 | KRYSTAL SPK 10 AWG 4 CORE | 5 | 70 | TRUE |
| spk_12_2 | Speaker 12 AWG 2-core | 25556.00 | KRYSTAL SPK 12 AWG 2 CORE | 5 | 80 | TRUE |
| spk_12_4 | Speaker 12 AWG 4-core | 48305.00 | KRYSTAL SPK 12 AWG 4 CORE | 5 | 90 | TRUE |
| spk_14_2 | Speaker 14 AWG 2-core | 18956.00 | KRYSTAL SPK 14 AWG 2 CORE | 5 | 100 | TRUE |
| spk_14_4 | Speaker 14 AWG 4-core | 35245.25 | KRYSTAL SPK 14 AWG 4 CORE | 5 | 110 | TRUE |
| spk_15_2 | Speaker 15 AWG 2-core | 14393.00 | KRYSTAL SPK 15 AWG 2 CORE | 5 | 120 | TRUE |
| spk_15_4 | Speaker 15 AWG 4-core | 26960.00 | KRYSTAL SPK 15 AWG 4 CORE | 5 | 130 | TRUE |
| power_tbd | Power cable (to be set) | 0 | POWER CABLE | 30 | 140 | FALSE |
| cat_tbd | CAT cable (to be set) | 0 | CAT CABLE | 30 | 150 | FALSE |

All `active = TRUE`.

---

## 6. Look and feel

**The owner rejected cluttered and "techy" designs. It must be minimal, clean and obvious.**

- **No helper text, hints, tooltips, instructions or explanatory copy anywhere.** Only field labels, values, prices and buttons. Short validation messages (section 7.1) are the only exception.
- **Everything visible at all times.** No control may rely on hover to show its colour or border (phones have no hover). Every button has explicit, fixed background, border and text colours in every state. Override browser and default styles fully.
- **Colours**
  - Brand navy **`#003862`**, used exactly (headers, primary buttons, selected states, steppers, prices)
  - Selected-card tint `#EAF1F7`
  - Text `#1D2733`, labels `#5B6B78`, input borders `#C9D3DC`, dividers `#EDF1F4`, dashed border `#9FB2C2`
  - Header subtitle text `#CFDBE5`, header divider `#3D6688`
  - Approve green `#1F9D55`, Deny/error red `#C0392B`
  - Page background white
- **Font:** **Inter**, weights 400 and 500 only, **bundled locally** (no runtime Google Fonts request). No decorative fonts.
- **Logo:** `assets/logo.png` (white "Just Audio" wordmark on transparent, 449×91, supplied by the owner). Never recreate it in text or a font.
- **App icons:** generate 192, 512 and maskable 512 PNGs plus an Apple touch icon (180): the logo centred on a `#003862` square with safe padding. Favicon too.
- **Sizes:** inputs and selects 46 px tall, 15 px text, 10 px radius. Primary buttons 52 px tall, 12 px radius, 16 px medium text. Labels 13 px. Price figures ~30 px medium. Touch targets ≥ 44 px.
- No shadows, gradients or emoji. Generous whitespace. Icons: a small, consistent outline icon set (e.g. Tabler), bundled.
- Screen transitions: a quick slide or fade (≤ 200 ms). Respect `prefers-reduced-motion`.

---

## 7. Screens (strictly sequential)

**Build → Cart → Order summary → Approve/Deny.** No cart icon, no tabs, no menus. Movement happens only through the buttons described here and the back arrows. The Android back button / browser back follows the same order (use history state).

Every screen has a navy `#003862` header bar (~58 px).

### 7.1 Build

**Header:** the logo (~26 px tall) on the left, then a thin vertical divider (`#3D6688`), then the text **"Cable Calculator"** (14 px, `#CFDBE5`). Nothing else.

**Hidden settings:** long-press the logo for 1 second to open Settings (7.6). Staff never need it.

**Fields** (label above each control):
1. **Customer** (text) and **Phone** (tel), side by side, Customer slightly wider.
2. **End A**: dropdown (`Select connector` placeholder, then active connectors by `sort`, then **None**) + a square 52×46 **Y toggle** button on the right, showing an **upright Y icon** (two arms at the top joining a stem going down). Off: white with navy icon. On: navy fill with white icon.
   - When the Y is on, a **second dropdown** appears directly below End A's dropdown (same width, no toggle; a small corner/branch icon sits in the toggle's column to show it belongs to End A). It defaults to the same connector as the first, so identical splits need no extra tap. Turning Y off removes the second connector.
   - The Y toggle is hidden when the end is None or not yet chosen.
3. **End B**: same as End A, but its Y icon is an **inverted Y** (stem at the top splitting into two arms at the bottom), so together they read like a split cable.
4. **Cable**: dropdown (`Select cable` placeholder, then active cables by `sort`). Auto-set per section 4.
5. **Length**: dropdown: `Select length`, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50 m, then **Custom**. Choosing Custom shows a numeric input (≈96 px wide, `inputmode="decimal"`, suffix "m") to the right of the dropdown and focuses it. Accept 0.1–500.

**Price cards** (below the fields, side by side): **METAL** and **PLASTIC**. White cards with a light border. Small caps label at the top, price (~30 px, navy) below. They show "—" until both ends, cable and length are set. Tapping a card **selects** it: 2 px navy border, `#EAF1F7` fill, and a small check icon in the top-right. Tapping the other card switches the selection. An unavailable tier shows "—" and ignores taps. A power or loose-cable build shows one full-width **PRICE** card instead.

**Footer:** a full-width navy **Proceed** button. On tap, validate in this order and show **one** short red message above the button, then stop:
- End A missing → "Pick End A"
- End B missing → "Pick End B"
- Cable missing → "Pick a cable"
- Length missing or invalid → "Pick a length"
- No card selected → "Pick Metal or Plastic"

If valid: add the cable to the cart (merging with an identical existing line: same connectors in the same order, cable, length and tier → quantity +1), clear the tier selection, and go to **Cart**. The customer name is **not** required to proceed.

### 7.2 Cart

- Header: back arrow (→ Build, selections kept) and the title **"Cart"**.
- One row per line, separated by thin dividers:
  - Line 1 (15 px medium): `10m XLR Male – XLR Female`. For a split end, join with " + ": `3m XLR Male + XLR Female – Jack TRS (stereo)`. A None end shows as "Loose": `50m Speaker 12 AWG 2-core (loose)`.
  - Line 2 (13 px grey): `Metal · ₹3,875`, where the amount is the line total (navy, medium)
  - Right side: a **quantity stepper** like Swiggy/Zomato: a pill with a 1.5 px navy border, `−`, the quantity, `+`, all navy on white and always visible. `−` at 1 removes the line immediately.
- Below the list: a dashed full-width **"+ Add another cable"** button (→ Build with the customer, phone and last cable's selections still filled in, and no tier selected).
- Empty state: "Cart is empty" centred, plus the Add button.
- Footer: **Total** label + rounded total (22 px navy) on the left; navy **Review order** button on the right (does nothing if the cart is empty).

### 7.3 Order summary

- Header: back arrow (→ Cart) and the title **"Order summary"**.
- Customer name (15 px medium) and phone (13 px grey) at the top. If the name is empty, show "No name" in red.
- The **consolidated breakdown**: identical items across all lines are summed, in order of first appearance. Each item shows:
  - its **Tally name** (13 px medium), e.g. `NEUTRIK NC3MXX`
  - beneath it: `2 pcs × ₹445.00` on the left and `₹890.00` on the right. Cable: `23 m × ₹74.43` → `₹1,711.89`.
- Then **SERVICE CHARGE** (only if points > 0):
  - `7 pts × ₹100 = ₹700.00`
  - `₹700.00 + 18% GST (₹126.00)` → on the right `₹826.00`
- A navy rule, then **Total** with the rounded total (~28 px navy). **No subtotal or "items + service" box.**
- Footer: two equal buttons:
  - **Deny** (white, red 1.5 px border, red text). The footer changes to "Clear this order?" with **Keep** (navy outline) and **Clear** (solid red). Clear runs a **full reset** (7.5).
  - **Approve** (solid green, WhatsApp icon). If the customer name is empty, go to Build, focus the name field and show "Add the customer's name", then stop. Otherwise open WhatsApp (7.4) and show the **Sent** screen.

### 7.4 WhatsApp hand-off

- URL: `https://wa.me/<accountant_whatsapp>?text=<encodeURIComponent(message)>`. If `accountant_whatsapp` is blank, use `https://wa.me/?text=…` (WhatsApp lets them choose a contact) and log a warning in Settings.
- Use `window.location.href` (works best in installed PWAs on Android and iOS).
- Message (plain text, exact format). This is example 7 from section 4:

```
JUST AUDIO – Cable order
Customer: Ravi (98220 12345)
15 Nov 2026, 2:17 pm

NEUTRIK NC3MXX
2 pcs × ₹445.00 = ₹890.00
NEUTRIK NC3FXX
2 pcs × ₹512.00 = ₹1,024.00
KRYSTAL DIGITAL MIC CABLE
23 m × ₹74.43 = ₹1,711.89
PLASTIC JACK TS
2 pcs × ₹250.00 = ₹500.00
PLASTIC JACK TRS
1 pcs × ₹250.00 = ₹250.00
SERVICE CHARGE
7 pts × ₹100 = ₹700.00
₹700.00 + 18% GST (₹126.00) = ₹826.00

TOTAL: ₹5,202
```

- The date line uses the device's local time (`d MMM yyyy, h:mm a`). The formatter takes the date as a parameter so tests can pass a fixed date.
- Omit the phone's brackets if there's no phone number. Omit the service block if there are 0 points.

**Sent screen:** a simple confirmation: a check icon, "Sent to accountant", the customer name and total, and one navy button **New order**, which runs a full reset. If WhatsApp didn't open, a secondary text button **Send again** re-opens it, and **Copy message** copies the text.

### 7.5 Full reset (Clear, New order, first-ever launch)

Opens a **blank** Build screen: Customer and Phone empty; End A/B on their placeholders, Y toggles off, second dropdowns gone; Cable and Length on their placeholders, custom input hidden; no tier selected; prices "—"; cart empty; no validation messages showing; scrolled to top.

### 7.6 Settings (hidden, owner/manager use)

Reached by long-pressing the logo. A simple screen with a back arrow:
- **Prices updated:** relative time + date. **Update now** button.
- Last error, if any (fetch or validation).
- A list of rows with `confirmed = FALSE` ("Needs checking"), so the owner can see the placeholders.
- Accountant WhatsApp number in use (read-only, from the sheet).
- App version.

### 7.7 Persistence

The current order (customer, phone, Build selections, cart) is saved to `localStorage` on every change and restored on reopen, so a phone call or app switch never loses work. Only a full reset clears it.

---

## 8. Accessibility and quality

- Everything works with one thumb. Large touch targets.
- Proper `<label>`s, `aria-label` on icon-only buttons (Y toggles, back arrows, stepper ±).
- Text contrast at least WCAG AA.
- No layout shift as prices update (fixed-width price area).
- Lighthouse PWA installability passes, and Performance ≥ 90 on mobile.

---

## 9. Project structure (suggested)

```
/assets/logo.png            (provided — do not modify the original)
/public/data/*.csv          (bundled default price data, sheet format)
/public/icons/*             (generated icons)
/src/config.ts              (sheet CSV URLs)
/src/pricing.ts             (pure functions: price a cable, consolidate order, format message)
/src/data.ts                (load, validate, cache price data)
/src/state.ts               (order and cart state + persistence)
/src/ui/*.ts                (screens)
/src/styles.css
/tests/unit/*.test.ts       (Vitest — all section 4 examples and more)
/tests/e2e/*.spec.ts        (Playwright — full flows at 390×844)
/screenshots/               (Playwright output for visual self-review)
README.md  PROGRESS.md  DECISIONS.md
```

Keep `pricing.ts` free of DOM code so it's fully unit-testable.

---

## 10. Out of scope

Editing prices in the app · logins or roles · discounts or dealer pricing · PDF quotes or invoices · direct Tally integration · Amphenol as a third tier · dark mode · multiple languages.

---

## 11. README.md for the owner (write in plain, non-technical English)

Include short, numbered steps for:
1. **Create the master sheet:** make a Google Sheet with tabs `Connectors`, `Cables` and `Settings`; import the three CSVs from `public/data/`; fill in `accountant_whatsapp`.
2. **Publish each tab as CSV** and paste the three links into `src/config.ts`.
3. **Put the app online** (one-time): GitHub Pages (include a ready GitHub Actions workflow in `.github/workflows/deploy.yml`) or Netlify drag-and-drop of the `dist` folder. Give the commands to build.
4. **Install on phones:** Android Chrome → ⋮ → *Add to Home screen* / *Install app*. iPhone Safari → Share → *Add to Home Screen*.
5. **Change prices:** edit the sheet. Phones update next time the app opens online, or right away from Settings → Update now (long-press the logo).
6. **Add a new connector or cable:** add a row and fill every column.
7. What the `confirmed` column means, and the list of placeholders to check (from section 5).
8. Running it locally (`npm install`, `npm run dev`) for whoever maintains it.

---

## 12. Milestones (copy into PROGRESS.md and tick off)

- [ ] **M0 Setup:** Vite + TS project, lint, Vitest, Playwright, git init, PROGRESS.md, DECISIONS.md
- [ ] **M1 Data:** default CSVs in `public/data/`; CSV loading, validation, caching, background refresh; unit tests
- [ ] **M2 Pricing engine:** `pricing.ts` with every rule in section 4; all worked examples pass; consolidation and message formatting tests (exact match to section 7.4)
- [ ] **M3 Build screen:** fields, Y toggles with second dropdowns, None, auto cable, custom length, price cards, validation, Proceed
- [ ] **M4 Cart:** lines, steppers, merging, Add another cable, Review order
- [ ] **M5 Order summary:** breakdown, service charge lines, Total, Deny→Keep/Clear, Approve→WhatsApp→Sent screen, full reset
- [ ] **M6 Persistence, Settings and back-button behaviour**
- [ ] **M7 PWA:** manifest, icons from logo, service worker, offline (test with Playwright offline mode), installability
- [ ] **M8 Visual polish:** screenshots of every state at 390×844 and 768×1024; review each against sections 6 and 7; fix issues; re-screenshot
- [ ] **M9 E2E:** full flows (simple cable, Y split, loose cable, power connector, merge, stepper to zero, deny/clear, approve message content, blank state after reset, offline launch)
- [ ] **M10 Docs and deploy prep:** README.md (section 11), GitHub Pages workflow, `npm run build` produces a deployable `dist/`
- [ ] **M11 Final check:** go through *Definition of done* line by line and write a short final report at the top of PROGRESS.md (what's done, decisions taken, what the owner must do next)

---

## 13. Definition of done

- [ ] All unit tests pass, including every worked example in section 4 and the exact message in 7.4.
- [ ] All e2e flows in M9 pass.
- [ ] `npm run build` succeeds, and `dist/` works when served statically.
- [ ] App installs (manifest and service worker valid), and after one load it opens and calculates **offline**.
- [ ] Changing a CSV served at the configured URL updates prices after "Update now", and invalid data is rejected without breaking the app.
- [ ] A fresh launch and every full reset show a completely blank Build screen.
- [ ] Screens match section 7, with no helper text, nothing hover-dependent, and the brand navy `#003862` and Inter used throughout. Verified via screenshots in `screenshots/`.
- [ ] A typical quote (XLR Male → XLR Female, mic cable auto, 10 m) shows both prices after choosing End A, End B and Length.
- [ ] README.md lets a non-technical owner set up the sheet, deploy and install on phones.
- [ ] PROGRESS.md has a final report. DECISIONS.md lists every assumption made.
