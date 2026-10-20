# Chromalie engineering guide

## Architecture

Chromalie is a static client-side website hosted on Netlify at https://chromalie.page. The shipped site lives under `dist/`. There is no user account or server-side painting service.

- `dist/index.html` and `dist/style.css`: page structure, studio controls and responsive presentation.
- `dist/app.js`: studio state, canvas composition, painting operations, undo/redo, IndexedDB persistence, library integration and exports.
- `dist/engine.js` and the worker: shape/region processing and masks. Read the implementation before changing pixel thresholds or region IDs.
- `dist/mobile.js`: moves existing controls into mobile strips. Keep original element IDs and listeners intact.
- `dist/journal.js`: local saved-work journal.
- `dist/guide.js`: tour and tooltips.
- `dist/catalog.json`: prepared artwork metadata. The catalogue is not a live Google Drive feed.

## Rendering model

The original line artwork is kept apart from the transparent painting canvas. Compositing paints onto white, then multiplies the original line artwork over it, preserving printed outlines and shading. Brush operations are drawn to temporary canvases and clipped to selected regions in automatic mode. Some media apply additional pixel processing before committing to the paint canvas.

Chromalie supports up to five independent transparent paint layers. The active layer uses the editable paint canvas; inactive layers are held as canvas snapshots. Composition respects each layer's visibility and opacity. IndexedDB saves a merged preview, per-layer PNG blobs and layer metadata. Version 2 editable project exports contain each layer and its metadata; version 1 single-layer projects remain importable. Undo/redo stores up to ten snapshots per layer during the open studio session; histories are not persisted between visits. Layer renaming, reordering and deletion are implemented. Undoing structural changes to the layer stack is not implemented. Keep the eraser preview, print/export composition, project import, autosave and responsive controls in sync when extending layers. The layer list is rebuilt on every change, so `drawLayerControls()` hands keyboard focus back to the same control of the same layer (or the first enabled control of that layer when the control is no longer enabled); the browser test checks that focus stays in the list.

## Colour tools

Built-in palettes and the custom palette are rendered by `renderColours()` in `dist/app.js`. The native HTML colour input selects arbitrary colours. `renderHarmonyColours()` derives analogous, complementary and triadic suggestions from the selected colour in HSL space; these are suggestions, not perceptually uniform or accessibility-checked combinations. Recent colours are limited to eight selections in memory per session. Custom palette additions and removals are saved in IndexedDB when local storage is enabled. Do not present recent colours as cross-session history.

`renderHarmonyColours()` also runs once at startup, so the row is filled before the first colour change. The studio panel in `index.html` is never shown: `dist/mobile.js` moves each control into a strip, and the Colours strip holds the palette chips, swatches, shade, custom colour, remove-colour button, recent colours and harmonies. A new control added to the panel but not to a `strip(...)` list in `mobile.js` is unreachable at every width. The browser test opens the Colours strip and fails if the recent or harmony rows are not in it.

## Netlify deployment

`netlify.toml` is the production build source of truth: the build restores checksum-approved artwork, stamps asset references and publishes `dist/`. The GitHub Actions workflow performs independent checks and uploads responsive screenshots but does not deploy the site. Because the two systems run separately, a green Netlify deployment does not establish that GitHub Actions tests passed. Confirm both and inspect the live result.

## Regions and stylus

Region analysis occurs asynchronously. Shapes are derived from artwork pixels; faint boundaries, gaps, large background areas and scanned artefacts can affect segmentation. Gap closing is adjustable, but should be regression-tested with intricate pages.

Pointer Events carry touch/pen input. Pressure behaviour depends on the device/browser; desktop browser automation does not establish palm rejection or stylus fidelity on hardware.

## Storage and recovery

IndexedDB stores artwork blobs, thumbnails and settings locally. The studio schedules debounced saves and serialises writes through a promise chain. Failed writes must remain visible as unsaved work; the user can retry or export. Navigation should not silently discard unsaved painting data. JSON project export is a separate backup path. Verify changes using a forced IndexedDB failure as well as normal save/reopen tests.

## Artwork pipeline

`assets-manifest.json` specifies approved image assets and expected checksums. `scripts/import-assets.py` restores assets for builds and validates size and SHA-256. Imported artwork belongs in the deployment artifact; CI must not push generated files back to `main`. Check catalogue IDs, credits, rights and existing IndexedDB keys before changing artwork.

## Build and release

Netlify site `chromalie` publishes `dist/` from `main`. Its build command is `python3 scripts/import-assets.py && python3 scripts/stamp-assets.py dist`. GitHub Actions does not publish the site, and Netlify does not serve `/version.json`.

`.github/workflows/deploy.yml` (`Publish Chromalie`) runs on pushes to `main` and on pull requests. It imports approved artwork, runs engine tests and browser tests, and stamps static assets. Screenshots are uploaded as workflow artifacts. `.github/workflows/studio-check.yml` runs the same engine and browser tests on pull requests. `.github/workflows/report-deployment-failure.yml` opens an issue only when the main test run fails.

Tests: `node --test tests/engine.test.js tests/catalog.test.js` (the second checks every catalogue page, its checksum and its credit), `node tests/ui.test.mjs` with Playwright Chromium and axe-core installed, and JavaScript syntax checks. Read the workflow for exact versions and commands. Browser coverage includes several viewport sizes, but real touch/stylus testing is still required.

A green Actions run means the build and tests passed. It does not by itself prove that Netlify has published that commit. Check the Netlify deploy, the public site and the responsive screenshots before marking a batch complete.

## Contribution checklist

1. Preserve the existing visual identity, library IDs, credits and saved-work compatibility.
2. Make a small, reviewable change; update relevant docs and tests.
3. Test the painting workflow on phone and desktop widths, including failure and recovery paths.
4. Avoid claiming native pigment physics, guaranteed offline access or structural undo of layer changes.
5. Verify deployment and accessibility before release sign-off.
