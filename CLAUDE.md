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

## Deploys and counts

The live deploy of the Netlify site `chromalie` has been locked since
19 October 2026, so a merge to `main` builds and does not go live. The
"Publish locked sites" workflow in Democracy-by-Design publishes the newest
finished build of every locked site, nominally at 07:47 and 19:47 IST; its runs
have started later than that, so run it by hand with `site = chromalie` to
publish at a time you choose. Batch the day's work into one merge and one
publish. Check the deploy list in Netlify, not only the CI run, before saying
a change is live.

`dist/count.js` adds one to a daily tally in Supabase through the function
`chromalie_track` (kinds: visit, open, download, print, share, journal, pdf,
install). It sends nothing else, nothing from localhost or automated browsers,
and nothing when Do Not Track or Global Privacy Control is on. A new counted
event needs a new kind in that function and a change to `scripts/build-legal.py`
in the same commit, because the privacy and cookies pages list what is counted.
The publishable key in `count.js` is public by design.
