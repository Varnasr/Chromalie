"""Add ?v=<content hash> to every local script, stylesheet and data file a page loads.

GitHub Pages serves everything with max-age=600 and no way to change it, so a
phone that has the site open can keep last week's app.js beside today's page.
A stamped address changes whenever its file does, so a new deploy can never be
paired with an old script. CI runs this on the build copy only; nothing is
committed, and the files in the repository keep their plain addresses.

Files are stamped leaves first: engine.js and brand.js before the scripts that
import them, so a change to engine.js also changes app.js's address.
"""
from pathlib import Path
import hashlib, re, sys

DIST = Path(sys.argv[1] if len(sys.argv) > 1 else 'dist')

def digest(name):
    return hashlib.sha256((DIST / name).read_bytes()).hexdigest()[:10]

def stamp(text, names):
    for name in names:
        # Only the bare address, quoted, so a second run does not stamp twice.
        text = re.sub(r"""(["'])(\./)?%s\1""" % re.escape(name),
                      lambda m: f"{m.group(1)}{m.group(2) or ''}{name}?v={digest(name)}{m.group(1)}", text)
    return text

def rewrite(name, names):
    path = DIST / name
    path.write_text(stamp(path.read_text(), names))

# Leaves, then the modules that import them, then the pages.
rewrite('regions-worker.js', ['engine.js'])
rewrite('app.js', ['engine.js', 'brand.js', 'regions-worker.js', 'catalog.json'])
# A module imported under two addresses runs twice, so count.js must have the
# same address in the page and in every module that imports it.
rewrite('share.js', ['count.js'])
rewrite('journal.js', ['brand.js', 'count.js', 'share.js', 'keep.js'])
assets = ['style.css', 'legal.css', 'app.js', 'tabs.js', 'mobile.js', 'journal.js', 'guide.js', 'brand.js', 'engine.js',
          'count.js', 'share.js', 'keep.js']
for page in sorted(DIST.glob('*.html')):
    rewrite(page.name, [a for a in assets if (DIST / a).exists()])

stamped = sum(len(re.findall(r'\?v=[0-9a-f]{10}', p.read_text())) for p in [*DIST.glob('*.html'), DIST / 'app.js', DIST / 'regions-worker.js', DIST / 'share.js', DIST / 'journal.js'])
print('Stamped references:', stamped)
if stamped == 0:
    sys.exit('No references were stamped; the page markup has probably changed.')
