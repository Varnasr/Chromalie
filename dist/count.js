// Anonymous daily counts: how many times the site was opened, pages opened
// (by collection), downloads, prints, shares, journal opens, journal PDFs and
// installs. Each event adds one to a tally for the day in Supabase (Mumbai).
// Nothing identifies a visitor: no cookie, no identifier, no address, no page
// title, no picture. Nothing is sent from a local copy, or when the browser
// asks sites not to track (Do Not Track or Global Privacy Control).
const URL_ = 'https://bivccpsnzzolxuqdvhfu.supabase.co/rest/v1/rpc/chromalie_track';
const KEY = 'sb_publishable_s5Pvx9fNo_7_ejmFC8fXPQ_Zj_N-9mN';
const off = (() => {
  const h = location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return true;
  if (navigator.webdriver) return true;
  if (navigator.globalPrivacyControl === true) return true;
  return navigator.doNotTrack === '1' || window.doNotTrack === '1';
})();
const clean = s => String(s || '-').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) || '-';

export function count(kind, item) {
  if (off) return;
  try {
    fetch(URL_, {
      method: 'POST', keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_kind: kind, p_item: clean(item) })
    }).catch(() => {});
  } catch (e) {}
}

count('visit');
addEventListener('chromalie:open', e => count('open', e.detail?.book));
addEventListener('chromalie:download', e => count('download', e.detail?.book));
addEventListener('chromalie:print', e => count('print', e.detail?.book));
addEventListener('appinstalled', () => count('install'));
