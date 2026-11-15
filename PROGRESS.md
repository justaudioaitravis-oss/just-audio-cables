# Progress

## Final report (15 Nov 2026)

**Status: complete.** All milestones M0–M11 are done, and every *Definition of done* item has been checked.

**Verified**
- `npm test`: 41 unit tests pass. They cover all 7 worked examples, the exact section 7.4 WhatsApp message, auto cable choice (slim for EP), Plastic disabled when a connector has no plastic price, cart merging, price lock, and sheet validation/caching.
- `npm run test:e2e`: 27 browser tests pass at 390×844. They cover a simple cable, Y split, loose cable, power connector, merging, stepper to zero, Deny/Keep/Clear, the Approve message content, the blank screen after a reset and on first launch, back-button order, persistence, Settings long-press, sheet update via "Update now", rejection of invalid sheet data, offline launch, and the manifest.
- `npm run build` produces a static `dist/`. It is also checked with a GitHub Pages sub-path build.
- Lighthouse (mobile): Performance 100, Best practices 100, Accessibility 93. The only deduction is the deliberate `maximum-scale=1` (see DECISIONS.md).
- Screenshots of every state at phone (390×844) and tablet (768×1024) sizes are in `screenshots/`. They were reviewed against sections 6 and 7, and the issues found were fixed (a CSS class clash on placeholders; the Y split mark was too faint).

**What you need to do next** (README.md has step-by-step instructions)
1. Create the Google Sheet from `public/data/*.csv` and fill in `accountant_whatsapp`.
2. Publish the three tabs as CSV and paste the links into `src/config.ts`.
3. Put the app online with GitHub Pages (workflow included) or Netlify drag-and-drop.
4. Install the app on staff phones.
5. Check the 22 placeholder rows marked `confirmed = FALSE` (listed in the app under Settings → Needs checking). The power and CAT cables are priced at ₹0 until you set them.

Every assumption is listed in `DECISIONS.md`.

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
