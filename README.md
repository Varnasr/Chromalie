# Chromalie

<img src="dist/wordmark.svg" width="260" alt="chromalie">

Live at https://chromalie.page

## Documentation

- [User guide](docs/USER-GUIDE.md): painting tools, palettes, local saving, downloads and troubleshooting.
- [Engineering guide](docs/ENGINEERING.md): canvas architecture, region processing, storage, asset imports, tests and releases.

Documentation describes the current implementation. Planned features such as independent painting layers and replay are not presented as shipped.


A static, free colouring studio run by StoryWell Books. The art is colouring books that StoryWell Books bought: eight with private label rights (PLR), and two sets of Indian pages. StoryWell's own art will be added over time.

The catalogue contains 666 pages in nine collections: Petal stories (flowers and plants, 100), Keepers of the night (owls, 50), The pattern atelier (geometric patterns, 70), On gossamer wings (butterflies, 50), Starlight wanderers (space, 155), Sunday drives (classic cars, 75), Here be dragons (50), Velvet paws (cats, 70) and Around India (46). Original IDs, images and IndexedDB keys are unchanged so existing artwork remains available.

Around India is pages 1 to 21 from Monkey Pen's India Colouring Book and pages 22 to 26 from Twinkl's India Colouring set, read from the PDFs in the owner's Drive ("Colouring Books/Others"). Each page carries `credit` and `creditUrl` in `catalog.json`; the studio links the credit under the page, and downloads print it in the footer. The publishers' own marks on the pages are kept. Twinkl's sixth page, a map of India, is left out because its northern boundary is not the official one. Pages 27 to 36 are ten folk-art pages (Gond, Warli, Pattachitra, Jagannath and others) drawn by the owner, Varna Sri Raman, and added on 15 October 2026; they are credited to her, linked to storywell.in. Pages 37 to 46 are ten everyday objects she drew (diya, mortar and pestle, cutting chai, saree, masala dabba, pressure cooker, matka, tiffin, jhadu, auto-rickshaw), cropped from her sheets with the neighbouring frame lines cleared and a border added, credited the same way.

## Release quality gate

A commit is **not** a finished feature or a verified public release. Every development batch must meet these conditions before it is marked complete:

1. The colouring-engine tests, browser interaction tests, responsive checks and accessibility audit pass in GitHub Actions (`Publish Chromalie` on pushes to `main` and on pull requests).
2. Netlify site `chromalie` finishes publishing that commit from `main`. The public site does not serve `/version.json`; do not treat a missing version file as a failed release.
3. The public homepage and core painting assets (`app.js`, `engine.js`, `mobile.js`, `journal.js`, `style.css`) return valid content from `chromalie.page`.
4. For visible UI changes, inspect the phone and desktop screenshots uploaded as the `chromalie-responsive-screenshots` workflow artifact. Browser screenshots are regression evidence, not a substitute for checking on a real touch device.
5. Record unverified device-specific behaviours (stylus pressure, palm rejection, printing, sharing and storage recovery) explicitly rather than describing them as finished.

`Publish Chromalie` fails when the build or the tests fail. It does not deploy to GitHub Pages. `Report Chromalie deployment failures` opens an issue only for those test failures on `main`. Netlify publishes independently. The release remains unverified until the Netlify deploy and the public site have been checked.

## Studio

Solid and gradient fill; pencil, marker, paint, watercolour, pastel, airbrush and glitter brushes; freehand painting; per-stroke area clipping; multi-area selection; eraser; eyedropper; brush size and opacity; shade slider; five palettes and a saved custom palette; pinch zoom, pan, undo and redo; PNG download and print.

The brushes approximate traditional media using canvas stamps. They do not simulate physical pigment mixing or reproduce Pigment's native brush engine. Pressure input uses the browser's Pointer Events when the stylus reports it.

Paint remains separate from original artwork. Final images multiply the original page over the paint so grey shading and black outlines stay visible. Region detection runs in a worker, recognises faint scanned outlines and closes gaps using a selectable 1, 2 or 4 pixel radius. White rims are reclaimed without painting ink. All brushes start in automatic mode, including shaded collections. Selection masks are used for every brush. Freehand requires an explicit choice, including if area detection fails. Areas touching the edge or covering over 35% of the page require enabling Paint background. Large openings can still join visually separate shapes; stronger gap protection can eliminate tiny regions.

Progress and palettes use IndexedDB on the visitor's device. No account, server upload, community gallery, or payment service is present; the only thing sent anywhere is the anonymous daily counts described below. Device saving can be disabled and saved work cleared through the storage settings. Editable project files can be downloaded and reopened locally. Clearing browser data can remove work. Undo history is limited to ten changes while a page is open; it is not stored between sessions.

The catalogue is a prepared snapshot. Changes in Drive require a new extraction and deployment. Source PDFs are not shipped to visitors. The extraction script expects the downloaded books in its declared scratch input directory; change that path for future imports.

A protected Chromalie footer appears under every studio sheet and library thumbnail. PNG exports and printouts append a canvas-rendered wordmark and the collection/page title. Source artwork and saved paint layers retain their original dimensions.

## Guidance

`dist/guide.js` gives a six-step tour the first time someone opens a page in the studio, and a tip on every control when a mouse or pen rests on it or the keyboard reaches it. Touch gets no tips, because a press on a phone should act at once. The Help panel can replay the tour. Whether the tour has been seen is kept in `localStorage` under `chromalie-tour`. A new control gets its tip as a line in `TIPS`.

The studio puts the page first at every screen size (`dist/mobile.js`, styles at the end of `dist/style.css`). A short sheet at the bottom holds one row of colours, Fill / Brush / Eraser, and a row of five round buttons: the current brush, size, shade, in the lines or freehand, and More. Each round button folds out one short strip above the sheet; tapping the page or pressing Escape folds it away. The strips hold the real controls, moved there from the old tool panel, so their handlers in `app.js` keep working; the old panel is never shown. Undo, redo and full screen float over the page. `dist/tabs.js` still marks the panel's groups but its tabs no longer appear.

## My journal

`dist/journal.js` adds "My journal" beside My work: a flipbook of every page coloured on this device, oldest first like a diary, opening on a cover with the count and dates. Each leaf is the page as it would download (drawing, paint and the Chromalie footer with any art credit), with the date it was last coloured and a Keep colouring button that reopens it in the studio. Swipe, the arrows or the arrow keys turn the page; Print or save as PDF prints every page, one to a sheet. It reads the studio's own saves (IndexedDB `colour-room`, store `artwork`), so nothing is stored twice and nothing leaves the device; with device saving off the journal is empty and says why. It reaches the catalogue and the studio through `window.chromalieCatalog` and `window.chromalieOpen` in `app.js`.

## Sharing

`dist/share.js` puts a Share button beside Download in the studio and on every journal page. It hands the page, as it would download, to the device's own share menu (`navigator.share` with a file), so WhatsApp and the rest appear there, with the words "I coloured ... on Chromalie, a free colouring studio by StoryWell Books" and the site link. Where a browser cannot share a picture it shares the words and link; where it cannot share at all it opens WhatsApp with the words written in, and says to download the page to send the picture. A browser lets a page share only straight after a tap, so if preparing a large page takes too long and the browser refuses, a small "Your picture is ready" bar offers a second tap. The studio hands the picture over through `window.chromalieArtwork` in `app.js`.

## Keeping saves on an iPhone

Safari on iPhone and iPad deletes a site's storage after seven days without a visit unless the site is on the Home Screen. `dist/keep.js` asks the browser to keep storage (`navigator.storage.persist()`, which a browser may refuse) the first time a page is opened, and on an iPhone or iPad that has saved work and is not running from the Home Screen shows one note on the home page, and a line on the journal cover, saying to add Chromalie to the Home Screen or save the journal as a PDF. The note's dismissal is kept in `localStorage` under `chromalie-keep-note`. `dist/manifest.webmanifest` and the icons in `dist/app/` (drawn from `icon.svg`) make the site installable. There is no service worker, so nothing can serve a stale copy.

## Anonymous counts

`dist/count.js` adds one to a daily tally for: the site opened (`visit`), a page opened (`open`, by collection id), `download`, `print`, `share`, the journal opened (`journal`), the journal printed or saved as PDF (`pdf`), and `install`. It sends the kind and, where there is one, the collection id, and nothing else: no cookie, no identifier, no title, no picture. It sends nothing from localhost, from an automated browser (so CI does not count), or when the browser sends Do Not Track or Global Privacy Control. Other modules report through `chromalie:open`, `chromalie:download` and `chromalie:print` events from `app.js`, or by importing `count()`.

The tallies go to `public.chromalie_track(kind, item)` in the Democracy by Design Supabase project (Mumbai), the same arrangement as offtheroll.in's: the table `chromalie_metrics (day, kind, item, count)` is closed to the public key, and the function accepts only the eight kinds and an item of lower-case letters, digits and hyphens up to 40 characters, and stops counting after 1,000 rows or 200,000 counts in a day. To read them, run in the Supabase SQL editor:

```sql
select day, kind, item, count from chromalie_metrics order by day desc, count desc;
```

The privacy, cookies and terms pages describe exactly this (`scripts/build-legal.py`). If anything else is ever counted, those pages change in the same commit.

## Checks

Run `node --test tests/engine.test.js` to verify segmentation boundaries, gap closure, pixel blending and shade calculation.

`tests/ui.test.mjs` is the browser test, and `Publish Chromalie` runs it on the stamped build: at 390x844 and 1280x900 it opens the library and a page, checks the first-visit tour appears, fills a shape and checks Undo comes alive, opens all four fold-out strips, picks a brush, checks the Share button, then opens the journal and turns to the coloured page. It runs axe (WCAG 2.1 A and AA) over the home page, the tour, the studio with a strip shut and open, and the journal, and fails on any serious or critical finding, any script error or failed request, and any page wider than the screen. Its first run found three things, now fixed: the Download button had no name on a phone (its label is hidden there), the step numbers on the home page were 2.3:1, and a dimmed sheet button was faded below 4.5:1 with opacity. To run it locally, install `playwright-core@1.56.1` and `axe-core@4.10.3` with `npm i --no-save` and then `node tests/ui.test.mjs`; set `CHROME` to use an installed Chromium.

Source pages and thumbnails were visually sampled. All catalogue assets, page IDs, counts, HTML control references and icon references were checked. Region detection was exercised on actual flower, owl, geometric, space and cat pages. The browser test covers a desktop and a phone-sized Chromium; Safari on a real iPhone, pinch gestures and storage that survives days still need a person with a device.

## Hosting

Buildless HTML, CSS and ES modules. Netlify site `chromalie` publishes `dist/` from `main` with the build command `python3 scripts/import-assets.py && python3 scripts/stamp-assets.py dist`. `.github/workflows/deploy.yml` runs that build and the tests on pushes to `main` and on pull requests. It does not publish the site. `scripts/import-assets.py` verifies artwork against `assets-manifest.json` and restores any missing approved files. CI must not commit those files. No application runtime secrets are required.

`scripts/stamp-assets.py` adds `?v=<content hash>` to each script, stylesheet and `catalog.json` address on the build copy, so a new page is not paired with an old script. Nothing stamped is committed. A new file that a page loads needs adding to the lists in that script.

The earlier public chatgpt.site deployment remains a separate origin. Browser artwork does not automatically transfer between website addresses. Editable project files provide a local way to move drawings once downloaded from a version supporting them.

## Policies and operator

StoryWell Books operates Chromalie. The contact is sales@storywell.in. Footer links cover terms, privacy, cookies and device storage, accessibility, and contact/rights requests. `scripts/build-legal.py` generates these pages. The notices describe the actual local storage and hosting behaviour. They do not claim a WCAG conformance level, and the terms give visitors personal, home and classroom use of what they colour, with no right to resell or repackage the uncoloured pages.

## Tool improvements

Stroke opacity is applied to the whole stroke after its brush texture is drawn. A chisel marker, smoothing control, live brush preview and focus view improve the drawing controls. Menu and homepage text is larger, with responsive layouts and larger touch controls.
