// Carrossel da seção Tecnologia: larguras variadas, setas, e o card em destaque se expande.
export function initTechCarousel(root = document) {
  const sec = root.querySelector('#tecnologia.tc')
  if (!sec) return
  const track = sec.querySelector('.tc-track')
  const items = [...track.querySelectorAll('.tc-item')]
  const prev = sec.querySelector('[data-tc="prev"]')
  const next = sec.querySelector('[data-tc="next"]')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  let idx = 0
  let raf = 0

  // Acompanha o card enquanto ele cresce, deslizando a trilha até ele de forma suave
  function follow() {
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    const step = (now) => {
      const max = track.scrollWidth - track.clientWidth
      const target = Math.max(0, Math.min(items[idx].offsetLeft - 4, max))
      if (reduce.matches) { track.scrollLeft = target; return }
      track.scrollLeft += (target - track.scrollLeft) * 0.18
      const elapsed = now - t0
      if (elapsed < 1500 && (elapsed < 650 || Math.abs(target - track.scrollLeft) > 1)) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  function activate(i, scroll = true) {
    idx = Math.max(0, Math.min(items.length - 1, i))
    items.forEach((el, n) => {
      const on = n === idx
      el.classList.toggle('on', on)
      if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current')
      el.querySelector('.tc-more').inert = !on // links e curtidas só ficam acessíveis no card em destaque
    })
    if (prev) prev.disabled = idx === 0
    if (next) next.disabled = idx === items.length - 1 // chega ao fim e para
    if (scroll) follow()
  }

  prev?.addEventListener('click', () => activate(idx - 1))
  next?.addEventListener('click', () => activate(idx + 1))
  items.forEach((el, n) => el.addEventListener('click', (ev) => {
    if (n !== idx && !ev.target.closest('a,button')) activate(n)
  }))
  track.addEventListener('keydown', (ev) => {
    const onItem = ev.target.classList?.contains('tc-item')
    if (ev.key === 'ArrowRight') { ev.preventDefault(); activate(idx + 1) }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); activate(idx - 1) }
    else if (onItem && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); activate(items.indexOf(ev.target)) }
  })
  // Se a pessoa arrastar ou rolar com o mouse/dedo, a animação automática sai do caminho
  ;['pointerdown', 'wheel'].forEach((type) => track.addEventListener(type, () => cancelAnimationFrame(raf), { passive: true }))
  activate(0, false)
}
