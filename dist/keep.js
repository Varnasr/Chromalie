// Keeping work safe. Saved pages live in this browser's storage, and browsers
// may clear it: Safari on iPhone and iPad deletes a site's storage after seven
// days without a visit, unless the site has been added to the Home Screen.
// So: ask the browser to keep the storage (it may say no), and on an iPhone or
// iPad that has saved work, say once how to keep it.
const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const saving = () => { try { return localStorage.getItem('chromalie-save-work') !== 'off'; } catch (e) { return true; } };

export const keepAdvice = isApple && !standalone
  ? 'On an iPhone or iPad, Safari clears saved pages after seven days without a visit. Add Chromalie to your Home Screen (Share, then Add to Home Screen) to keep them, or save your journal as a PDF.'
  : '';

let asked = false;
addEventListener('chromalie:open', () => {
  if (asked || !saving()) return;
  asked = true;
  try { navigator.storage?.persist?.(); } catch (e) {}
});

function savedCount() {
  return new Promise(resolve => {
    if (!window.indexedDB) return resolve(0);
    const req = indexedDB.open('colour-room');
    req.onerror = () => resolve(0);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('artwork')) { db.close(); return resolve(0); }
      const c = db.transaction('artwork').objectStore('artwork').count();
      c.onsuccess = () => { db.close(); resolve(c.result); };
      c.onerror = () => { db.close(); resolve(0); };
    };
  });
}

async function maybeNote() {
  if (!keepAdvice || !saving()) return;
  try { if (localStorage.getItem('chromalie-keep-note')) return; } catch (e) { return; }
  if (!(await savedCount())) return;
  const note = document.createElement('div');
  note.className = 'keep-note';
  note.setAttribute('role', 'note');
  note.innerHTML = `<p></p><button type="button" class="button small">Got it</button>`;
  note.querySelector('p').textContent = keepAdvice;
  note.querySelector('button').onclick = () => {
    try { localStorage.setItem('chromalie-keep-note', 'seen'); } catch (e) {}
    note.remove();
  };
  document.getElementById('home')?.prepend(note);
}
maybeNote();
