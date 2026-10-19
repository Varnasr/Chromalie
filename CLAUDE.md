# Chromalie

Shared engineering standard: @.claude/engineering-standards.md. It applies to all work in this repository. This file adds what is specific to the project, and wins where the two disagree.

A free colouring studio run by StoryWell Books, live at chromalie.page.
Netlify builds it with `python3 scripts/import-assets.py && python3
scripts/stamp-assets.py dist` and publishes `dist/`.

Read before changing anything: `docs/ENGINEERING.md` (canvas, regions,
storage, imports, tests and releases), `CONTRIBUTING.md`, `docs/ROADMAP.md`
and `docs/USER-GUIDE.md`. The README's release quality gate applies: a commit
is not a finished feature or a verified release.

## Commands

```bash
python3 scripts/import-assets.py          # imports and verifies the approved artwork
node --test tests/engine.test.js           # colouring engine
for f in dist/*.js; do node --check "$f"; done
node tests/ui.test.mjs                    # browser test, needs playwright-core and Chromium
```

The artwork's licences (PLR packs, Monkey Pen, Twinkl) are recorded per page in
`credit`. Do not add art without its licence recorded the same way.
