export const $ = (id) => document.getElementById(id)

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const paras = (t) =>
  String(t || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')

export const img = (u, cls = '') =>
  /^https?:\/\//.test(u || '') ? `<img class="${cls}" src="${esc(u)}" alt="" loading="lazy">` : ''

// '2026-03-02' -> ['02', 'mar']
export const dm = (d) => {
  const x = new Date(d + 'T12:00')
  return isNaN(x) ? ['', ''] : [String(x.getDate()).padStart(2, '0'), x.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')]
}
export const longDate = (d) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export function toast(t) {
  const x = $('toast')
  x.textContent = t
  x.classList.add('v')
  setTimeout(() => x.classList.remove('v'), 2200)
}

// Mostra a imagem ou, se não houver, um espaço reservado para ela
const ICONE = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M4 42 24 18l12 14 8-9 16 19z" fill="currentColor"/><circle cx="46" cy="12" r="6" fill="currentColor"/></svg>'
export const foto = (u, cls = '') => img(u, cls) || `<div class="ph ${cls}" role="img" aria-label="Espaço para imagem">${ICONE}</div>`
