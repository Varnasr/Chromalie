// Share a coloured page, picture and all, to WhatsApp or anywhere else the
// phone offers, through the browser's own share sheet. Where a browser cannot
// share a picture (Firefox, some desktops), it shares the words and the link,
// and where it cannot share at all it opens WhatsApp with the words written in.
import { count } from './count.js';

const SITE = 'https://chromalie.page/';
const words = page => `I coloured ${page?.title ? `"${page.title}"` : 'this page'} on Chromalie, a free colouring studio by StoryWell Books.`;
const toast = msg => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3200);
};

// A browser lets a page share only straight after a tap. Preparing a large
// picture can take longer than that, so if the browser refuses, the picture is
// kept ready and a second tap sends it at once.
let ready = null;
const again = document.createElement('div');
again.className = 'share-ready';
again.hidden = true;
again.innerHTML = '<span>Your picture is ready.</span><button type="button" class="button small">Share it</button><button type="button" class="share-ready-close" aria-label="Not now">×</button>';
document.body.append(again);
again.querySelector('.button').onclick = () => { again.hidden = true; if (ready) sharePicture(ready.blob, ready.page, true); };
again.querySelector('.share-ready-close').onclick = () => { again.hidden = true; ready = null; };

export async function sharePicture(blob, page, retry = false) {
  const text = words(page);
  const type = blob?.type || 'image/png';
  const name = `chromalie-${page?.id || 'page'}.${type === 'image/jpeg' ? 'jpg' : 'png'}`;
  if (!retry) count('share', page?.book);
  try {
    if (blob && navigator.canShare) {
      const file = new File([blob], name, { type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${SITE}` });
        return;
      }
    }
    if (navigator.share) {
      await navigator.share({ title: 'Chromalie', text, url: SITE });
      toast('Download the page to send the picture as well.');
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
    if (e?.name === 'NotAllowedError' && !retry) {
      ready = { blob, page }; again.hidden = false; again.querySelector('.button').focus();
      return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${SITE}`)}`, '_blank', 'noopener');
  toast('Download the page to send the picture as well.');
}

document.getElementById('share-page')?.addEventListener('click', async () => {
  const art = await window.chromalieArtwork?.();
  if (art) sharePicture(art.blob, art.page);
});
