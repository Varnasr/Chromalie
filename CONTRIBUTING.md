# Contributing to Chromalie

Chromalie is a free, browser-based colouring studio from StoryWell Books. The production website is https://chromalie.page, hosted on Netlify. GitHub stores source code and runs CI; it does not publish GitHub Pages.

## Development setup

You need Python 3, Node.js, and a modern Chromium browser for the full test suite.

1. Clone this repository and work on a feature branch.
2. Restore approved artwork: `python3 scripts/import-assets.py`. The importer validates byte lengths and SHA-256 checksums in `assets-manifest.json`.
3. Serve `dist/` using a local static HTTP server, for example `python3 -m http.server 8000 --directory dist`.
4. Run engine tests: `node --test tests/engine.test.js`.
5. Check JavaScript syntax: `node --check dist/app.js`.
6. Install browser test dependencies: `npm i --no-save playwright-core@1.56.1 axe-core@4.10.3`, install Chromium with Playwright, then run `node tests/ui.test.mjs`.

The `main` branch triggers GitHub Actions checks and an independent Netlify build. The Netlify command and publish directory are defined in `netlify.toml`. The build stamps asset references on its working copy; never commit stamped URLs or generated imported artwork accidentally.

## Change checklist

- Preserve existing artwork IDs and IndexedDB keys to avoid losing saved user work.
- Treat user-supplied artwork and third-party pages as licensed material; check attribution and reuse rights.
- Maintain paint/ink separation, layer composition, export/print consistency and project import compatibility.
- Add regression tests for changes to controls, rendering or storage. Test both mobile and desktop widths.
- Check error paths: storage quota, failed IndexedDB writes, malformed project JSON and unavailable sharing.
- Keep `README.md`, `docs/USER-GUIDE.md`, `docs/ENGINEERING.md`, `docs/ROADMAP.md` and `dist/help.html` consistent.
- Avoid introducing external telemetry or uploading drawings. Privacy and legal notices must be updated before data practices change.
- Use descriptive commits and a pull request that states what was tested and what remains unverified.

## Known boundaries

The site does not provide accounts, cloud saves, full offline support or guaranteed stylus pressure. Undo history is session-only, and layer structural changes cannot be undone. See [the roadmap](docs/ROADMAP.md).
