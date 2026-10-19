# Chromalie development roadmap

Updated 19 October 2026. Production hosting: **Netlify**, source and CI: **GitHub**.

A feature is **implemented** when its code is on `main`; it is **verified** only when automated checks and relevant real-device checks have passed. A successful Netlify deploy alone does not prove the feature works.

## Implemented in the repository

- Catalogue, search, collections, detail filtering, painting studio and introductory tour.
- Region-aware fill and brushes, freehand mode, eraser, adjustable size and opacity, zoom and pan.
- Six built-in colour palettes, editable custom palette, native colour picker, recent session colours and harmony suggestions.
- Up to five paint layers: select, show/hide, opacity, rename, reorder and delete. Each layer has a separate session undo/redo history.
- Local IndexedDB saves, save failure notices, editable project JSON v2 export/import (with v1 import compatibility), PNG export, printing, journal and device sharing.
- Responsive mobile controls, About, Help and legal pages.
- Netlify build configuration and GitHub Actions checks.

## Verification and refinement outstanding

1. Run and inspect GitHub Actions browser/engine tests after each change; repair regressions.
2. Confirm Netlify publishes the intended `main` commit and loads all assets.
3. Test layer switching, reordering, deletion, undo, import/export and autosave on real phone and desktop browsers.
4. Audit keyboard navigation, focus visibility, contrast, accessible names and screen-reader announcements. Partly automated: axe (WCAG 2.1 A and AA) runs on the home page, tour, studio, Colours strip, brushes strip and journal at phone and desktop widths. A keyboard walk of the studio on 19 October 2026 found every stop named and visibly focused, and strips opened with the keyboard now take focus and return it on Escape. Not done: a screen reader pass, and keyboard colouring of the canvas itself, which is not supported.
5. Review brush textures, stroke smoothing and complex region boundaries on representative pages.
6. Review artwork quality, source attribution and licensing before adding or replacing pages.
7. Check real-device printing, sharing, stylus pressure, touch gestures and storage recovery.

## Deliberately deferred

- Cross-device accounts, cloud sync, subscriptions and public galleries.
- Full physical-pigment simulation, replay, layer-stack undo and persistent undo history.
- Guaranteed offline mode.

Prioritise reliability and accessibility before expanding the feature set. Do not describe the above verification tasks as complete without evidence.
