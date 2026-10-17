// Phones: the tool panel is split into four tabs so each group fits the short
// panel without a long scroll. Colours come first because they change most.
// Wider screens keep the single column, so this only marks the groups; the
// stylesheet decides, below 650px, which group shows.
const panel = document.querySelector('.tool-panel');

const GROUPS = {
  colours: ['.palette-heading', '#swatches', '.custom-colour', '.shade-control'],
  brushes: ['#brush-tools', '.utility-tools', '#selection-info'],
  settings: ['.tool-settings'],
  more: ['.project-actions', '.studio-policy-links', '.panel-bottom']
};
const LABELS = { colours: 'Colours', brushes: 'Brushes', settings: 'Settings', more: 'More' };

for (const [group, sels] of Object.entries(GROUPS))
  for (const sel of sels) panel.querySelector(sel)?.setAttribute('data-group', group);

const bar = document.createElement('div');
bar.className = 'panel-tabs';
bar.setAttribute('role', 'tablist');
bar.setAttribute('aria-label', 'Tool groups');
for (const [group, label] of Object.entries(LABELS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'tab');
  b.dataset.tab = group;
  b.textContent = label;
  b.onclick = () => select(group);
  bar.append(b);
}
(panel.querySelector('#mode-hint') || panel.querySelector('.mode-tabs')).after(bar);

function select(group) {
  panel.dataset.tab = group;
  for (const b of bar.children) b.setAttribute('aria-selected', String(b.dataset.tab === group));
  panel.scrollTop = 0;
}
// Arrow keys move between tabs, as in any tab list.
bar.addEventListener('keydown', e => {
  const tabs = [...bar.children], i = tabs.indexOf(document.activeElement);
  if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.focus(); next.click(); e.preventDefault();
});
select('colours');

// Let other modules (the tour) bring a group into view.
window.chromalieShowGroup = el => {
  const group = el?.closest?.('[data-group]')?.dataset.group;
  if (group && bar.offsetParent !== null && panel.dataset.tab !== group) select(group);
};
