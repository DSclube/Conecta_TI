export const $ = (id) => document.getElementById(id)

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Texto simples com uma pequena sintaxe segura: **negrito**, *itálico*, [texto](URL).
// URLs digitadas diretamente também viram links; nenhuma tag HTML do conteúdo é confiada.
export const richText = (text = '') => {
  let value = esc(text)
  const links = []
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, url) => {
    const token = `%%SAFE_LINK_${links.length}%%`
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    return token
  })
  value = value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  value = value.replace(/https?:\/\/[^\s<]+/gi, (raw) => {
    const suffix = raw.match(/[.,!?;:)\]]+$/)?.[0] || ''
    const url = suffix ? raw.slice(0, -suffix.length) : raw
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${suffix}`
  })
  value = value.replace(/%%SAFE_LINK_(\d+)%%/g, (_, index) => links[Number(index)])
  return value
}

export const paras = (t) =>
  String(t || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${richText(p).replace(/\n/g, '<br>')}</p>`).join('')

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
