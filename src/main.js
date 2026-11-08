import './css/style.css'
import { sb } from './js/supabase.js'
import { $, esc, toast } from './js/util.js'
import { renderEdition, renderArticle } from './js/render.js'
import { DEMO } from './js/demo.js'
import { initAdmin } from './js/admin.js'

let eds = []
let cur = null
const liked = () => JSON.parse(localStorage.getItem('cti_likes') || '[]')

function show(e) {
  cur = e
  const params = new URLSearchParams(location.search)
  if (params.has('noticia')) {
    const c = Array.isArray(e.conteudo) ? {} : e.conteudo || {}
    const articles = [c.principal, ...(c.secundarias || []), ...(c.tecnologia || []), ...(c.extras || [])].filter((x) => x?.titulo)
    const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const article = articles.find((a) => slug(a.titulo) === params.get('noticia'))
    if (article) { renderArticle(e, article); return }
  }
  renderEdition(e)
  $('nLike').textContent = e.curtidas || 0
  const on = liked().includes(e.id)
  $('bLike').classList.toggle('on', on)
  $('bLike').setAttribute('aria-pressed', on)
  $('sel').value = e.id
}

async function load() {
  if (sb) {
    const { data, error } = await sb.from('edicoes').select('*').order('publicada_em', { ascending: false })
    if (error) { toast('Erro ao carregar edições'); eds = [] } else eds = data
  } else eds = DEMO
  if (!eds.length) {
    $('out').innerHTML = '<p class="vazio">Nenhuma edição publicada ainda.</p>'
    $('sel').innerHTML = ''
    return
  }
  $('sel').innerHTML = eds.map((e) => `<option value="${esc(e.id)}">Edição ${String(e.numero).padStart(2, '0')} – ${new Date(e.publicada_em + 'T12:00').toLocaleDateString('pt-BR')}</option>`).join('')
  const id = decodeURIComponent(location.hash.slice(1))
  const requested = new URLSearchParams(location.search).get('edicao')
  show(eds.find((x) => String(x.id) === requested) || eds.find((x) => String(x.id) === id) || eds[0])
}

$('sel').onchange = (ev) => {
  const e = eds.find((x) => String(x.id) === ev.target.value)
  history.replaceState(null, '', '#' + encodeURIComponent(e.id))
  show(e)
}

$('bLike').onclick = () => {
  const L = liked(), on = L.includes(cur.id)
  localStorage.setItem('cti_likes', JSON.stringify(on ? L.filter((i) => i !== cur.id) : [...L, cur.id]))
  cur.curtidas = Math.max(0, (cur.curtidas || 0) + (on ? -1 : 1))
  if (sb) sb.rpc(on ? 'descurtir' : 'curtir', { p_id: cur.id }).then((r) => r.error && toast('Não foi possível registrar a curtida'))
  show(cur)
}

$('bShare').onclick = async () => {
  const url = location.href.split('#')[0] + '#' + encodeURIComponent(cur.id)
  try { if (navigator.share) { await navigator.share({ title: document.title, url }); return } } catch { return }
  try { await navigator.clipboard.writeText(url); toast('Link copiado!') } catch { prompt('Copie o link:', url) }
}

$('bPdf').onclick = () => window.print()

// Rolagem suave para as seções (o hash da edição não é alterado)
$('anchors').addEventListener('click', (ev) => {
  const a = ev.target.closest('a')
  if (!a) return
  ev.preventDefault()
  document.getElementById(a.dataset.s)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

initAdmin({ onPublished: load })
load()
