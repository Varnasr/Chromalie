# Chromalie development roadmap

Updated 17 November 2026. Production hosting: **Netlify**, source and CI: **GitHub**.

A feature is **implemented** when its code is on `main`; it is **verified** only when automated checks and relevant real-device checks have passed. A successful Netlify deploy alone does not prove the feature works.

## Implemented in the repository

- Catalogue, collections, painting studio, a first-visit hint and a tour on request.
- A name and search words for every page (drafted 17 November 2026 from the pictures, for the owner to correct), search that matches every word typed, and four detail levels set by the number of shapes on each page.
- An address for every open page, so Back returns to the library and a reload reopens the page.
- A count of shapes coloured, a way to see the ones left, and a finish dialog; finished pages are marked in My work.
- Downloads and prints at twice the page's pixels with smoothed outlines.
- Region-aware fill and brushes, freehand mode, eraser, adjustable size and opacity, zoom and pan.
- Six built-in colour palettes, editable custom palette, native colour picker, recent session colours and harmony suggestions.
- Up to five paint layers: select, show/hide, opacity, rename, reorder and delete. Each layer has a separate session undo/redo history.
- Local IndexedDB saves, save failure notices, editable project JSON v2 export/import (with v1 import compatibility), PNG export, printing, journal and device sharing.
- Responsive mobile controls, About, Help and legal pages.
- Ten collections, 688 pages. Festivals of India (22 pages, 20 October 2026) is the densest: up to about 3,300 regions a page. Segmenting it takes about 95 ms on a desktop, the same as the butterflies, so no page is slower to open than an existing one.
- Netlify build configuration and GitHub Actions checks.

## Verification and refinement outstanding

1. Run and inspect GitHub Actions browser/engine tests after each change; repair regressions.
2. Confirm Netlify publishes the intended `main` commit and loads all assets.
3. Test layer switching, reordering, deletion, undo, import/export and autosave on real phone and desktop browsers. The owner tested on a tablet, a computer and a phone on 20 October 2026 and reported no problems; the devices, browsers and cases were not recorded.
4. Audit keyboard navigation, focus visibility, contrast, accessible names and screen-reader announcements. Partly automated: axe (WCAG 2.1 A and AA) runs on the home page, tour, studio, Colours strip, brushes strip and journal at phone and desktop widths. A keyboard walk of the studio on 19 October 2026 found every stop named and visibly focused, and strips opened with the keyboard now take focus and return it on Escape. Keyboard colouring of whole shapes (arrow keys move a visible pointer, Enter or Space fills, tested at phone and desktop widths on 20 October 2026) is built; brush strokes and the eraser remain pointer-only. The owner listened to the studio with TalkBack on 20 October 2026 and found it fine; what she covered was not recorded, so this is a pass by ear and not a documented test. Not done: a VoiceOver pass, and descriptions of the shapes on a page.
5. Review brush textures, stroke smoothing and complex region boundaries on representative pages.
6. Review artwork quality, source attribution and licensing before adding or replacing pages. The Festivals of India pages were made by the owner, Varna Sri Raman, with an image generator, and she holds whatever rights the generator's terms give her in its output (her statement, 20 October 2026; the generator's name was not recorded). Whether copyright subsists in machine-generated images is unsettled in Indian law, so the credit line describes them as made by her with an image generator and does not claim more. Open: the PLR packs' terms have not been reviewed.
7. Check real-device printing, sharing, stylus pressure, touch gestures and storage recovery. Covered by the owner's 20 October 2026 test only so far as item 3 says.

8. The 17 November 2026 changes were tested in headless Chromium at 390x844 and 1280x900 only. Not checked: a real phone's Back gesture, the double-size download on a phone short of memory (it falls back to the page's own size), and a printed sheet.
9. Read the 688 page names against the pictures. They were written mostly from contact sheets; the report on the pull request lists the least certain ones.
10. `butterflies-042` cannot be filled: its paper is grey and the engine reads all of it as outline. The artwork file needs cleaning and its checksum updating.

## Deliberately deferred

- Cross-device accounts, cloud sync, subscriptions and public galleries.
- Full physical-pigment simulation, replay, layer-stack undo and persistent undo history.
- Guaranteed offline mode.

Prioritise reliability and accessibility before expanding the feature set. Do not describe the above verification tasks as complete without evidence.
