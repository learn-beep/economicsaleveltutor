// Site-wide behaviours: crop zoom, dismissible hints, toasts.
export function initZoom() {
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.qcard img.crop, .pack img, .card3d img');
    if (!img || !img.src) return;
    const ov = document.createElement('div'); ov.className = 'zoom';
    ov.innerHTML = `<button class="btn close" type="button">Close</button><img src="${img.src}" alt="${img.alt || ''}">`;
    const close = () => { ov.remove(); document.body.style.overflow = ''; };
    ov.querySelector('.close').addEventListener('click', close);
    ov.addEventListener('click', (ev) => { if (ev.target === ov) close(); });
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  });
}
export function initHints() {
  document.querySelectorAll('[data-hint]').forEach((el) => {
    const key = 'malt-hint-' + el.dataset.hint;
    try { if (localStorage.getItem(key)) { el.remove(); return; } } catch {}
    const b = el.querySelector('button'); if (b) b.addEventListener('click', () => { try { localStorage.setItem(key, '1'); } catch {} el.remove(); });
  });
}
export function toast(msg) {
  let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
}
initZoom(); initHints();
window.maltToast = toast;
