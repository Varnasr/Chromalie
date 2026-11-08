"""Write the search tags, sitemap.xml and robots.txt for the pages in dist/.

Every page gets one block between <!-- seo:start --> and <!-- seo:end --> in
its head: a canonical address and the Open Graph tags, taken from the page's
own title and description. sitemap.xml lists every page in dist/ that is not
marked noindex. Run it after build-legal.py or after adding a page, and commit
the result; tests/seo.test.js fails when the pages, the sitemap and the tags
disagree.

Addresses are the form the live site answers 200 for without a redirect: the
home page as "/" and every other page without ".html". The apex domain is the
canonical host, because www.chromalie.page answers 301.
"""
from pathlib import Path
import re

DIST = Path(__file__).resolve().parents[1] / 'dist'
HOST = 'https://chromalie.page'
START, END = '<!-- seo:start -->', '<!-- seo:end -->'


def address(page):
    return HOST + '/' if page.name == 'index.html' else HOST + '/' + page.stem


def noindex(text):
    return re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', text, re.I) is not None


def tags(text, url):
    title = re.search(r'<title>(.*?)</title>', text, re.S).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', text).group(1)
    return (f'{START}<link rel="canonical" href="{url}">'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="Chromalie">'
            f'<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">'
            f'<meta property="og:url" content="{url}"><meta name="twitter:card" content="summary">{END}')


urls = []
for page in sorted(DIST.glob('*.html')):
    text = page.read_text()
    if noindex(text):
        continue
    url = address(page)
    block = tags(text, url)
    if START in text:
        text = re.sub(re.escape(START) + '.*?' + re.escape(END), lambda m: block, text, flags=re.S)
    else:
        text = text.replace('</head>', block + '</head>', 1)
    page.write_text(text)
    urls.append(url)

urls.sort(key=lambda u: (u != HOST + '/', u))
(DIST / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
(DIST / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {HOST}/sitemap.xml\n')
print(f'{len(urls)} pages in sitemap.xml')
