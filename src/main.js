import './css/style.css'
import { sb } from './js/supabase.js'
import { $, esc, toast } from './js/util.js'
import { renderEdition, renderArticle, renderDateDetail } from './js/render.js'
import { DEMO } from './js/demo.js'
import { initAdmin } from './js/admin.js'
import { initPrivacyUI, hasAnalyticsConsent } from './js/privacy.js'

let eds = []
let cur = null
let metrics = {}
let metricsOnline = false
let yearMessages = []
let liked = hasAnalyticsConsent() ? JSON.parse(localStorage.getItem('cti_article_likes') || '[]') : []
const metricKey = (e, article) => `${e.id}:${String(article.titulo).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
const saveLocalMetrics = () => { if (hasAnalyticsConsent()) localStorage.setItem('cti_article_metrics', JSON.stringify(metrics)) }

function registerView(e, article) {
  if (!hasAnalyticsConsent()) return
  const id = metricKey(e, article)
  metrics[id] ||= { likes: 0, views: 0 }
  metrics[id].views++
  saveLocalMetrics()
  if (metricsOnline) sb.rpc('visualizar_noticia', { p_id: id }).then(({ error }) => error && toast('Não foi possível registrar a visualização'))
}

function show(e) {
  cur = e
  $('sel').value = e.id
  const params = new URLSearchParams(location.search)
  if (params.has('data')) {
    const c = Array.isArray(e.conteudo) ? {} : e.conteudo || {}
    const date = c.datas?.[Number(params.get('data'))]
    if (date) { renderDateDetail(e, date); return }
  }
  if (params.has('noticia')) {
    const c = Array.isArray(e.conteudo) ? {} : e.conteudo || {}
    const articles = [c.principal, ...(c.secundarias || []), ...(c.tecnologia || []), ...(c.extras || [])].filter((x) => x?.titulo)
    const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const article = articles.find((a) => slug(a.titulo) === params.get('noticia'))
    if (article) { registerView(e, article); renderArticle(e, article, metrics, liked); return }
  }
  renderEdition(e, metrics, liked, yearMessages)
}

async function loadYearMessages() {
  if (!sb) return
  const { data, error } = await sb.from('mensagens_fim_ano').select('id, professor, mensagem, aprovada, criada_em').eq('aprovada', true).order('criada_em', { ascending: false })
  if (!error) yearMessages = data || []
}

async function submitYearMessage(form) {
  const status = form.querySelector('.year-message-status')
  const button = form.querySelector('button[type="submit"]')
  const professor = form.elements.professor.value.trim()
  const mensagem = form.elements.mensagem.value.trim()
  if (!professor || mensagem.length < 10) return
  if (!sb) { status.textContent = 'O envio de mensagens estará disponível quando o banco estiver configurado.'; return }
  button.disabled = true
  status.textContent = 'Enviando…'
  const { error } = await sb.from('mensagens_fim_ano').insert({ professor, mensagem, aprovada: false })
  button.disabled = false
  if (error) { status.textContent = 'Não foi possível enviar agora. Tente novamente.'; return }
  form.reset()
  status.textContent = 'Mensagem enviada! Ela será avaliada pela equipe antes de aparecer no jornal.'
}

async function load() {
  if (sb) {
    const { data, error } = await sb.from('edicoes').select('*').order('publicada_em', { ascending: false })
    if (error) { toast('Erro ao carregar edições'); eds = [] } else eds = data
    if (data?.length) {
      const result = await sb.from('noticia_metricas').select('id, curtidas, visualizacoes')
      if (!result.error) {
        metricsOnline = true
        metrics = Object.fromEntries(result.data.map((row) => [row.id, { likes: row.curtidas, views: row.visualizacoes }]))
      } else metrics = hasAnalyticsConsent() ? JSON.parse(localStorage.getItem('cti_article_metrics') || '{}') : {}
    }
    await loadYearMessages()
  } else {
    eds = DEMO
    metrics = hasAnalyticsConsent() ? JSON.parse(localStorage.getItem('cti_article_metrics') || '{}') : {}
  }
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

$('out').addEventListener('click', (ev) => {
  const button = ev.target.closest('[data-action="like-news"]')
  if (!button || !cur) return
  const id = button.dataset.id, on = liked.includes(id)
  liked = on ? liked.filter((item) => item !== id) : [...liked, id]
  if (hasAnalyticsConsent()) localStorage.setItem('cti_article_likes', JSON.stringify(liked))
  metrics[id] ||= { likes: 0, views: 0 }
  metrics[id].likes = Math.max(0, metrics[id].likes + (on ? -1 : 1))
  saveLocalMetrics()
  button.classList.toggle('on', !on)
  button.setAttribute('aria-pressed', String(!on))
  const count = button.querySelector('[data-likes-for]')
  if (count) count.textContent = metrics[id].likes
  if (hasAnalyticsConsent() && metricsOnline) sb.rpc(on ? 'descurtir_noticia' : 'curtir_noticia', { p_id: id }).then(({ error }) => error && toast('Não foi possível registrar a curtida'))
})

$('out').addEventListener('submit', (ev) => {
  const form = ev.target.closest('#year-message-form')
  if (!form) return
  ev.preventDefault()
  submitYearMessage(form)
})

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
initPrivacyUI({ onConsentChange: (enabled) => {
  liked = enabled ? JSON.parse(localStorage.getItem('cti_article_likes') || '[]') : []
  load()
} })
load()
