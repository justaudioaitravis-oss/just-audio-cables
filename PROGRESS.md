# Progress

## Status at end of day (15 Nov 2026)

**The app is live:** https://justaudioaitravis-oss.github.io/just-audio-cables/
It's connected to the live Google Sheet (accountant WhatsApp set) and deploys automatically from the `main` branch on GitHub (`justaudioaitravis-oss/just-audio-cables`).

**Checks:** 57 unit tests and 37 browser tests pass; the build is clean; the live site was checked in a phone-sized browser (prices, sheet download, offline cache, no errors). Lighthouse (mobile): Performance 100, Best practices 100, Accessibility 93. The 93 is the deliberate zoom lock, see DECISIONS.md.

### What changed after the first build
1. **Went live:** the sheet links went into `src/config.ts`, the app was pushed to GitHub, and it was deployed with GitHub Pages.
2. **Stress test on the live app**, done like a real user. Fixed:
   - A double-tap on *Review order* could send the order to WhatsApp before anyone reviewed it.
   - A double-tap on *Approve* could wipe the order straight after sending.
   - Fix: each new screen ignores taps for 0.35 s.
   - Custom length now refuses entries like "1e2".
3. **Three price levels:** Neutrik / Generic metal / Generic plastic, shown as three rows.
   - `metal_price` = Neutrik (column name kept so the sheet didn't break).
   - New optional columns: `generic_metal_price`, `generic_metal_tally_name`.
   - RCA (Amphenol ₹290) is now Generic metal in the built-in data.
4. **Loose connectors:** choose **No cable** in the Cable list. Length hides, and the price is the connectors only, with **no service charge**. Loose cable (None → None) also has no service charge.
5. **Lengths up to 100 m:** … 50, 60, 70, 80, 90, 100 m, then Custom.
6. **Clear button** (top right of the first screen):
   - Cart empty: clears all fields instantly.
   - Cables in the cart: asks "Clear this order?" (Keep / Clear).
   - The header fits on 360 px phones.

### Still to do (owner)
1. **Update the Connectors tab for Generic metal.** The easiest way: File → Import → Upload `~/Desktop/connectors-updated.csv` → *Replace current sheet*. The file is your live data plus the two new columns, with RCA moved. Until this is done, Amphenol RCA shows under "Neutrik". Alternatively, connect Google Drive (`/mcp` → claude.ai Google Drive) so Claude can edit the sheet directly.
2. **Fill in Generic metal prices and Tally names** for the connectors that have a non-Neutrik metal version. Only RCA has one so far.
3. **Clear the 22 "Needs checking" rows** (Settings → Needs checking). The power cable and CAT cable cost ₹0 until set.
4. **Install on staff phones** (Chrome ⋮ → Add to Home screen; Safari Share → Add to Home Screen), then do one test order to confirm the WhatsApp message reaches the accountant.
5. **Optional:** after big price changes, ask for the built-in prices (`public/data/`) to be refreshed. Phones that lose their saved data while offline fall back to them.

### Notes on safety and upkeep
- Anyone with the app link can see retail prices; the sheet links and accountant number are public. Keep cost prices and margins out of this spreadsheet.
- Turn on 2-step verification for the Google and GitHub accounts. They control prices and the app.
- If prices look wrong, check Settings (hold the logo for 1 s): "Prices updated" should be recent and "Last error" empty.

Every assumption is listed in `DECISIONS.md`.

## First build report (15 Nov 2026)

All milestones M0–M11 were done and every *Definition of done* item was checked. That included the 7 worked examples, the exact WhatsApp message, every e2e flow in M9, offline launch, a sheet update via "Update now" with invalid data rejected, screenshots of every state at 390×844 and 768×1024, and the owner README with a GitHub Pages workflow.

## Milestones
- [x] **M0 Setup:** Vite + TS project, lint, Vitest, Playwright, git init, PROGRESS.md, DECISIONS.md
- [x] **M1 Data:** default CSVs in `public/data/`; CSV loading, validation, caching, background refresh; unit tests
- [x] **M2 Pricing engine:** `pricing.ts` with every rule in section 4; all worked examples pass; consolidation and message formatting tests (exact match to section 7.4)
- [x] **M3 Build screen:** fields, Y toggles with second dropdowns, None, auto cable, custom length, price cards, validation, Proceed
- [x] **M4 Cart:** lines, steppers, merging, Add another cable, Review order
- [x] **M5 Order summary:** breakdown, service charge lines, Total, Deny→Keep/Clear, Approve→WhatsApp→Sent screen, full reset
- [x] **M6 Persistence, Settings and back-button behaviour**
- [x] **M7 PWA:** manifest, icons from logo, service worker, offline (test with Playwright offline mode), installability
- [x] **M8 Visual polish:** screenshots of every state at 390×844 and 768×1024; review each against sections 6 and 7; fix issues; re-screenshot
- [x] **M9 E2E:** full flows (simple cable, Y split, loose cable, power connector, merge, stepper to zero, deny/clear, approve message content, blank state after reset, offline launch)
- [x] **M10 Docs and deploy prep:** README.md (section 11), GitHub Pages workflow, `npm run build` produces a deployable `dist/`
- [x] **M11 Final check:** go through *Definition of done* line by line and write a short final report at the top of PROGRESS.md

## Notes
- Nothing skipped or blocked. Creating the Google Sheet and deploying need your own accounts, so they are prepared and documented in README.md.
