// Flashcards with Leitner-style spacing, saved per deck in the browser.
export function leitner(key) {
  let box = {};
  try { box = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(box)); } catch {} };
  return {
    get: (id) => box[id] || 1,
    knew: (id) => { box[id] = Math.min((box[id] || 1) + 1, 4); save(); },
    missed: (id) => { box[id] = 1; save(); },
    reset: () => { box = {}; save(); },
    /** Cards in lower boxes come up more often: box 1 every round, 2 every other, 3 every third, 4 every fourth. */
    due: (ids, round) => ids.filter((id) => round % (box[id] || 1) === 0),
    counts: (ids) => ids.reduce((c, id) => { const b = box[id] || 1; c[b] = (c[b] || 0) + 1; return c; }, {}),
  };
}
export function shuffle(a) { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
export function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
