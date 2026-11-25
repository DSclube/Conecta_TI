// Carrossel horizontal de notícias completas, controlável por toque, mouse e teclado.
export function initTechCarousel(root = document) {
  const sec = root.querySelector('#tecnologia.tc')
  if (!sec) return
  const track = sec.querySelector('.tc-track')
  const prev = sec.querySelector('[data-tc="prev"]')
  const next = sec.querySelector('[data-tc="next"]')
  const step = () => Math.max(240, Math.round(track.clientWidth * 0.85))
  const update = () => {
    const max = track.scrollWidth - track.clientWidth
    if (prev) prev.disabled = track.scrollLeft <= 2
    if (next) next.disabled = track.scrollLeft >= max - 2
  }
  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }))
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }))
  track.addEventListener('scroll', update, { passive: true })
  new ResizeObserver(update).observe(track)
  update()
}
