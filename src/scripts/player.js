// Shared client code for the practice player, mock builder, essays and question of the day (Economics).
import { iconSvg } from '../lib/icons.js';
export const SCORES_KEY = 'malt-scores';
export async function loadBank() { const r = await fetch('/data/practice.json'); return r.json(); }
export function loadScores() { try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); } catch { return {}; } }
export function saveScore(topics, earned, total, id) {
  const s = loadScores();
  for (const t of topics) { const row = s[t] || { earned: 0, total: 0, n: 0, ids: [] }; if (row.ids.includes(id)) continue; row.earned += earned; row.total += total; row.n += 1; row.ids.push(id); s[t] = row; }
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(s)); } catch {}
  return s;
}
export function clearScores() { try { localStorage.removeItem(SCORES_KEY); } catch {} }
export function shuffle(a) { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
export function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/** Question card. opts.mark adds self-marking (marks for short answers, levels for essays); opts.mcq adds tappable A–E for MCQs. */
export function card(q, opts = {}) {
  const el = document.createElement('article');
  el.className = 'qcard'; el.dataset.id = q.id;
  const pill = q.d ? `<span class="pill pill-${q.d.toLowerCase()}">${q.d}</span>` : '';
  const isMcq = q.f === 'Multiple choice' && q.ans && q.ans.length;
  const isEssay = q.f === 'Essay' || q.f === 'Extended response';
  // Edexcel levels-marked answers: KAA levels plus evaluation levels. These are the marks for a mid-level answer at each overall level.
  const LEVELS = { 25: [[1, 5], [2, 11], [3, 17], [4, 22]], 20: [[1, 4], [2, 9], [3, 14], [4, 18]], 15: [[1, 4], [2, 9], [3, 13]], 12: [[1, 3], [2, 7], [3, 11]], 10: [[1, 3], [2, 6], [3, 9]], 8: [[1, 2], [2, 5], [3, 7]] };
  const levels = LEVELS[q.m] || [[1, Math.round(q.m * 0.3)], [2, Math.round(q.m * 0.6)], [3, Math.round(q.m * 0.9)]];
  el.innerHTML = `
    <div class="meta"><strong>${esc(q.s)} · ${q.l === 'AS' ? 'AS ' : ''}${esc(q.p)} · Q${esc(q.q)}</strong><span>${q.m} mark${q.m === 1 ? '' : 's'}</span>${q.ao ? `<span>${esc(q.ao)}</span>` : ''}${q.f ? `<span>${esc(q.f)}</span>` : ''}${pill}</div>
    ${q.st ? `<details class="stem"><summary>${iconSvg('file')}Data and extracts for question ${esc(String(q.q).replace(/\(.*$/, ''))}</summary><img class="crop" data-src="${q.st}" alt="Data and extracts" decoding="async"></details>` : ''}
    ${q.c ? `<img class="crop" src="${q.c}" alt="Question ${esc(q.q)}, ${esc(q.s)} ${esc(q.p)}" decoding="async">` : ''}
    ${isMcq && opts.mcq ? `<div class="markrow mcqrow"><span>Your answer:</span>${['A', 'B', 'C', 'D', 'E'].slice(0, Math.max(4, ...q.ans.map((a) => a.charCodeAt(0) - 64))).map((L) => `<button class="chip" type="button" data-opt="${L}">${L}</button>`).join('')}</div><p class="text mcqfb" hidden></p>` : ''}
    <div class="actions">
      ${isMcq && !opts.mcq ? `<button class="btn" type="button" data-reveal="ans" aria-expanded="false">${iconSvg('key')}Answer</button>` : ''}
      ${q.ms ? `<button class="btn" type="button" data-reveal="ms" aria-expanded="false">${iconSvg('check')}Mark scheme</button>` : ''}
      ${q.e ? `<button class="btn" type="button" data-reveal="er" aria-expanded="false">${iconSvg('comment')}Examiner's comment</button>` : ''}
    </div>
    ${isMcq ? `<div class="reveal" data-panel="ans" hidden><h4>Answer</h4><p><strong>${q.ans.join(' and ')}</strong></p></div>` : ''}
    ${q.ms ? `<div class="reveal" data-panel="ms" hidden><h4>Mark scheme</h4><div class="ms-wrap"><img class="crop" data-src="${q.ms}" alt="Mark scheme" decoding="async"></div>
      ${opts.mark && !isMcq ? (isEssay
        ? `<div class="markrow"><span>Level you'd award:</span>${levels.map(([l, mk]) => `<button class="chip" type="button" data-mark="${mk}">Level ${l}</button>`).join('')}<button class="chip" type="button" data-mark="0">0</button></div>`
        : `<div class="markrow"><span>Marks you earned:</span>${Array.from({ length: q.m + 1 }, (_, i) => `<button class="chip" type="button" data-mark="${i}">${i}</button>`).join('')}</div>`) : ''}</div>` : ''}
    ${q.e ? `<div class="reveal" data-panel="er" hidden><h4>Examiner's comment</h4><p>${esc(q.e)}${q.e.endsWith('…') ? ` <a href="/questions/${q.t[0]}/#${q.id}">Read the full comment</a>` : ''}</p></div>` : ''}`;
  el.querySelectorAll('[data-reveal]').forEach((btn) => btn.addEventListener('click', () => {
    const panel = el.querySelector(`[data-panel="${btn.dataset.reveal}"]`);
    const img = panel.querySelector('img[data-src]'); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    const open = panel.hasAttribute('hidden'); panel.toggleAttribute('hidden', !open); btn.setAttribute('aria-expanded', String(open));
  }));
  el.querySelectorAll('details.stem').forEach((d) => d.addEventListener('toggle', () => { if (!d.open) return; const img = d.querySelector('img[data-src]'); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); } }, { once: true }));
  el.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('[data-mark]').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    opts.onMark && opts.onMark(Number(b.dataset.mark));
  }));
  if (isMcq && opts.mcq) {
    const chosen = new Set(); const need = q.ans.length; const fb = el.querySelector('.mcqfb');
    el.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
      if (fb.textContent) return;
      const L = b.dataset.opt; chosen.has(L) ? chosen.delete(L) : chosen.add(L); b.setAttribute('aria-pressed', String(chosen.has(L)));
      if (chosen.size === need) {
        const right = q.ans.every((a) => chosen.has(a)); fb.hidden = false;
        fb.textContent = right ? `Correct: ${q.ans.join(' and ')}.` : `Not quite: the answer is ${q.ans.join(' and ')}.`;
        opts.onMark && opts.onMark(right ? q.m : 0);
      }
    }));
  }
  return el;
}
export function fmtTime(s) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; }
