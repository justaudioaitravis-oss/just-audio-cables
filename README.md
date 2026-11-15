# Cable Calculator – Just Audio

A phone app that prices custom audio and power cables in a few taps. Staff pick the two ends, the cable and the length, read out the **Neutrik**, **Generic metal** and **Generic plastic** prices, add cables to a cart, and **Approve** to send the item list to the accountant on WhatsApp.

- **Loose cable** (no connectors): set End A and End B to **None**. Price = cable × length, no service charge.
- **Loose connectors** (no cable): pick the connector(s) on End A (use the Y button for two), set End B to **None**, and choose **No cable** in the Cable dropdown. Price = connectors only, no service charge.

All prices come from one Google Sheet that you control. Change the sheet and every phone updates.

---

## 1. Create the master sheet (one time, about 10 minutes)

1. Open [Google Sheets](https://sheets.google.com) and create a new, blank spreadsheet. Name it **Just Audio – Cable prices**.
2. At the bottom, rename the first tab to **Connectors**. Add two more tabs named **Cables** and **Settings**. The names must match exactly.
3. Click the **Connectors** tab. Choose **File → Import → Upload** and upload `public/data/connectors.csv` from this project. When asked, choose **Replace current sheet**.
4. Do the same for the **Cables** tab with `public/data/cables.csv`, and for the **Settings** tab with `public/data/settings.csv`.
5. In the **Settings** tab, type the accountant's WhatsApp number in the `value` cell next to `accountant_whatsapp`. Use digits only and start with the country code, for example `919822012345`.
   - If this is left blank, WhatsApp asks staff to choose a contact each time.

### Already made the sheet before November 2026's update? Add two columns

The app now has three price levels: **Neutrik**, **Generic metal** and **Generic plastic**. Your sheet keeps working as it is. To use Generic metal:

1. In the **Connectors** tab, add two column headings in the next empty columns of row 1: `generic_metal_price` and `generic_metal_tally_name` (exactly as written, lower case).
2. Fill in the generic metal price and Tally name for each connector that has one. Leave the rest empty.
3. For **RCA**: move `290` from `metal_price` to `generic_metal_price` and `AMPHENOL ACPR` from `metal_tally_name` to `generic_metal_tally_name`, then clear the two `metal_` cells. Otherwise Amphenol RCA shows up as "Neutrik".

The `metal_price` column is the **Neutrik** price. Its name stays the same so nothing breaks.

## 2. Publish each tab and connect it to the app

1. In the sheet, choose **File → Share → Publish to web**.
2. In the first dropdown, pick **Connectors**. In the second, pick **Comma-separated values (.csv)**. Click **Publish** and copy the link.
3. Repeat for **Cables** and **Settings**, so you have three links.
4. Open the file `src/config.ts` in this project and paste each link between the quotes:

   ```ts
   export const SHEET_CSV = {
     connectors: 'https://docs.google.com/spreadsheets/d/e/…/pub?gid=0&single=true&output=csv',
     cables: 'https://docs.google.com/…',
     settings: 'https://docs.google.com/…',
   };
   ```

5. Save the file, then put the app online (step 3). If you change these links later, put the app online again.

Leave **Publish to web** switched on. Anyone with a link can read the prices, but nobody can edit the sheet except you.

## 3. Put the app online (one time)

The app is a set of plain files, so any static web host works. Pick one.

**Option A: GitHub Pages (updates automatically)**

1. Create a free account at [github.com](https://github.com) and a new repository, for example `just-audio-cables`.
2. Upload this project to it, or push it with git:
   ```
   git remote add origin https://github.com/<your-user>/just-audio-cables.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under **Source**, choose **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) builds and publishes the app on every push. After 1–2 minutes it is live at `https://<your-user>.github.io/just-audio-cables/`.

**Option B: Netlify (drag and drop)**

1. On a computer with [Node.js](https://nodejs.org) installed, open a terminal in this folder and run:
   ```
   npm install
   npm run build
   ```
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the `dist` folder onto the page. Netlify gives you a link.
3. To update it later, run `npm run build` again and drag the new `dist` folder onto your Netlify site's **Deploys** page.

Cloudflare Pages works the same way: build command `npm run build`, output folder `dist`.

## 4. Install on staff phones

Open the app's link once on each phone, then:

- **Android (Chrome):** tap **⋮** (top right) → **Add to Home screen** or **Install app**.
- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.

A **Cables** icon appears on the home screen. It opens full-screen and keeps working without internet, using the last prices it downloaded.

## 5. Change prices

Edit the numbers in the Google Sheet. That's all.

- Phones pick up the new prices the next time the app is opened with internet.
- To update a phone immediately, **press and hold the Just Audio logo for 1 second** to open Settings, then tap **Update now**.
- Cables already in a cart keep the price they were added at.
- If the sheet has a mistake, such as a letter in a price column, the app keeps using the last good prices. The problem is shown under **Last error** in Settings.

## 6. Add a new connector or cable

Add a new row at the bottom of the **Connectors** or **Cables** tab and fill in **every** column:

| Column | What to put |
|---|---|
| `id` | A short, unique code with no spaces, for example `mini_xlr`. Never change it once used. |
| `label` | The name staff see in the dropdown. |
| `group` (Connectors only) | `audio`, `power` or `data`. Power connectors show one price card instead of Metal and Plastic. |
| `metal_price` | **Neutrik** price in ₹ **including GST**. Leave it empty if there is no Neutrik version. For power connectors this is the only price and must be filled in. |
| `generic_metal_price` | **Generic metal** price (Amphenol or any other non-Neutrik metal connector), including GST. Empty = not available. |
| `plastic_price` | **Generic plastic** price, including GST. Empty = not available. |
| `metal_tally_name` / `generic_metal_tally_name` / `plastic_tally_name` | The item name exactly as it is in Tally, for each of the three prices. The accountant receives this name. Needed only where that price is filled in. |
| `default_cable` (Connectors only) | The `id` of the cable chosen automatically for this connector. It must exist in the Cables tab. |
| `roll_price_100m` (Cables only) | Price in ₹ including GST for a 100 m roll. |
| `tally_name` (Cables only) | The cable's name in Tally. |
| `priority` (Cables only) | When two connectors suggest different cables, the higher number wins. For example, slim (20) beats mic (10), so anything with an EP gets slim cable. |
| `sort` | Position in the dropdown. Lower numbers come first. |
| `active` | `TRUE` to show it, `FALSE` to hide it without deleting it. |
| `confirmed` | See step 7. |

If any connector on a cable has no price for a tier, that tier shows "—" and can't be chosen. Every connector needs at least one price.

The **Settings** tab also holds `service_charge_per_point` (₹ per soldered connector, before GST), `gst_rate` (as a decimal, for example `0.18`) and `business_name`.

## 7. The `confirmed` column: placeholders to check

`confirmed = FALSE` marks a row whose price, Tally name or default cable still needs checking. It changes nothing for staff. These rows are listed under **Needs checking** in Settings. When a row is correct, change it to `TRUE`.

These rows start as placeholders:

- **Jack TRS (stereo):** the plastic price copies the mono jack (₹250).
- **EP:** the plastic price uses the generic "EP connector" price (₹180).
- **Speakon, RCA:** prices from the website. RCA's metal version is Amphenol, so it is listed as **Generic metal** and has no Neutrik price.
- **Generic metal prices:** none are filled in yet except RCA. Until you add them, the Generic metal row shows "—" for those connectors.
- **Speakon 8-pole, EtherCON:** no plastic version. EtherCON uses a CAT cable that has no price yet.
- **PowerCON (in/out):** default to the mic cable as a placeholder. Set the right cable.
- **PowerCON TRUE1, Bals, Camlock:** use **Power cable (to be set)**, which costs ₹0 until you fill in its `roll_price_100m`.
- **Cables "Power cable (to be set)" and "CAT cable (to be set)":** set their real price and Tally name.

## 8. For whoever maintains the app

You need [Node.js](https://nodejs.org) 20 or newer.

```
npm install          # once
npm run dev          # run locally at http://localhost:5173
npm test             # unit tests (pricing, data validation)
npm run test:e2e     # browser tests at phone size; also refreshes screenshots/
npm run lint
npm run build        # production files in dist/
npm run preview      # serve dist/ locally
npm run icons        # regenerate app icons from assets/logo.png
```

- The first run of `npm run test:e2e` may need `npx playwright install chromium`.
- Pricing rules live in `src/pricing.ts`, sheet loading and checking in `src/data.ts`, and screens in `src/ui/`.
- Built-in prices are in `public/data/*.csv`. The app uses them until it first reaches the sheet.
- `PROGRESS.md` shows the build status. `DECISIONS.md` lists every assumption made.
