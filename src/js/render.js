import { $, esc, paras, foto, dm, longDate, richText } from './util.js'

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const metricId = (e, article) => `${e.id}:${slug(article.titulo)}`
const articleStats = (e, article, metrics = {}, liked = []) => {
  const id = metricId(e, article), stat = metrics[id] || { likes: 0, views: 0 }, on = liked.includes(id)
  return `<div class="article-stats"><button class="news-like${on ? ' on' : ''}" type="button" data-action="like-news" data-id="${esc(id)}" aria-pressed="${on}" aria-label="Curtir ${esc(article.titulo)}"><span aria-hidden="true">♥</span><span data-likes-for="${esc(id)}">${stat.likes || 0}</span></button><span class="news-views" aria-label="${stat.views || 0} visualizações"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span data-views-for="${esc(id)}">${stat.views || 0}</span></span></div>`
}

const linkMais = (e, artigo) => {
  const external = /^https?:\/\//i.test(artigo.link || '')
  const href = external ? artigo.link : `?edicao=${encodeURIComponent(e.id)}&noticia=${encodeURIComponent(slug(artigo.titulo))}`
  return `<a class="ler-mais" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Ler mais <span aria-hidden="true">↗</span></a>`
}

export function renderEdition(e, metrics = {}, liked = [], yearMessages = []) {
  const c = Array.isArray(e.conteudo) ? {} : e.conteudo || {}
  const p = c.principal?.titulo ? c.principal : null
  const sec = c.secundarias || [], ev = c.eventos || [], te = c.tecnologia || []
  const da = c.datas || [], ex = (c.extras || []).filter((item) => !/sugest[aã]o de pauta/i.test(item.secao || ''))
  const especial = c.especial_fim_de_ano || {}
  // Ativo quando marcado no painel; edições antigas sem a opção mantêm o comportamento anterior (só a nº 1)
  const especialFimDeAno = especial.ativo === 'sim' || (especial.ativo === undefined && Number(e.numero) === 1)

  // Cabeçalho
  $('masthead').innerHTML = `
    <button class="admin-top" id="bAdm">Administrador</button>
    <div class="selo"><span class="l a">Nossa</span><span class="l b">história</span><span class="l c">TRANSFORMA</span><span class="l d">muitas</span><span class="l e">histórias</span><i class="dots"><u></u><u></u></i></div>
    <div class="tit"><h1><i>NEWSLETTER</i>CONNECTA TI</h1>
      <div class="sub"><u></u><u></u><hr><span>JORNAL DOS CURSOS DE TI DO CIMATEC</span></div></div>
    <div class="num"><small>${esc(longDate(e.publicada_em))}</small><small>Ano ${esc(e.ano || 1)} · Publicação quinzenal</small><strong>Nº ${String(e.numero).padStart(2, '0')}</strong></div>`

  // Faixa giratória fixa com os cursos, sem títulos de notícias.
  const courses = [
    'Desenvolvimento de Sistemas',
    'Redes de Computadores',
    'Informática para Internet',
    'Ford Enter',
    'Pós Técnico em Desenv. em IA',
    'Pós Técnico em Cibersegurança'
  ]
  const strip = courses.map((course) => `<span>${esc(course)}</span>`).join('')
  $('ticker').innerHTML = `<div class="run">${strip}<span class="dup" aria-hidden="true">${strip}</span></div>`

  // Bloco principal: o número de colunas depende do que foi preenchido
  const left = sec.length === 1 ? `<div class="col">${sec.map((s) => `<article class="mini"><h3>${esc(s.titulo)}</h3>${foto(s.imagem, '', s.legenda, s.descricao_imagem || s.legenda || s.titulo)}${paras(s.texto)}${linkMais(e, s)}${articleStats(e, s, metrics, liked)}</article>`).join('')}</div>` : ''
  const center = p ? `<article class="main"><span class="rot">Destaque</span>${foto(p.imagem, 'big', p.legenda, p.descricao_imagem || p.legenda || p.titulo)}<h2>${esc(p.titulo)}</h2>${p.resumo ? `<p class="lead">${esc(p.resumo)}</p>` : ''}${paras(p.texto)}${linkMais(e, p)}${articleStats(e, p, metrics, liked)}</article>` : ''
  const right = ev.length ? `<aside class="col"><div class="evt"><h3>Próximos eventos</h3><ul>${ev.map((v) => { const [d, m] = dm(v.data); return `<li><time><b>${d}</b>${m}</time><div><strong>${esc(v.titulo)}</strong><small>${richText(v.local || '')}</small></div></li>` }).join('')}</ul></div></aside>` : ''
  const cols = [[left, '.85fr'], [center, '1.8fr'], [right, '.9fr']].filter((x) => x[0])
  const top = cols.length ? `<section id="destaque" class="top3" style="--cols:${cols.map((x) => x[1]).join(' ')}">${cols.map((x) => x[0]).join('')}</section>` : ''

  const otherNews = sec.length > 1 ? `<section id="noticias" class="sec"><h2 class="sh">Outras notícias</h2><div class="cards">${sec.map((s) => `<article class="card">${foto(s.imagem, '', s.legenda, s.descricao_imagem || s.legenda || s.titulo)}<h3>${esc(s.titulo)}</h3>${paras(s.texto)}${linkMais(e, s)}${articleStats(e, s, metrics, liked)}</article>`).join('')}</div></section>` : ''
  const tech = te.length ? `<section id="tecnologia" class="sec"><h2 class="sh">Tecnologia</h2><div class="cards">${te.map((t) => `<article class="card">${foto(t.imagem, '', t.legenda, t.descricao_imagem || t.legenda || t.titulo)}<h3>${esc(t.titulo)}</h3>${paras(t.texto)}${linkMais(e, t)}${articleStats(e, t, metrics, liked)}</article>`).join('')}</div></section>` : ''
  const dates = da.length ? `<section id="datas" class="sec datas"><h2 class="sh">Datas importantes no mundo de tecnologia</h2><div class="cal">${da.map((d, i) => { const [x, m] = dm(d.data); const href = /^https?:\/\//i.test(d.link || '') ? d.link : `?edicao=${encodeURIComponent(e.id)}&data=${i}`; return `<a class="dt c${i % 5}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(d.titulo)} — abrir informações relacionadas"><time><b>${x}</b>${m}</time><span class="dt-title">${esc(d.titulo)}</span></a>` }).join('')}</div></section>` : ''
  const extras = ex.map((x) => `<section id="${slug(x.secao || x.titulo)}" class="sec"><h2 class="sh">${esc(x.secao || x.titulo)}</h2><article class="extra comimg">${foto(x.imagem, '', x.legenda, x.descricao_imagem || x.legenda || x.titulo)}<div><h3>${esc(x.titulo)}</h3>${paras(x.texto)}${linkMais(e, x)}${articleStats(e, x, metrics, liked)}</div></article></section>`).join('')
  const approvedMessages = (yearMessages || []).filter((item) => item?.aprovada && item?.professor && item?.mensagem)
  const messageCards = approvedMessages.map((item) => `<article class="year-message"><p>“${esc(item.mensagem)}”</p><strong>Para ${esc(item.professor)}</strong><small>Mensagem anónima</small></article>`).join('')
  const special = especialFimDeAno ? `<section id="especial-fim-de-ano" class="sec special-news-section" aria-labelledby="year-special-title"><h2 class="sh">Especial de fim de ano</h2><article class="special-news${especial.imagem ? '' : ' no-image'}">${especial.imagem ? `<div class="special-news-media">${foto(especial.imagem, 'special-news-image', especial.legenda, especial.descricao_imagem || especial.legenda || 'Imagem do especial de fim de ano')}</div>` : ''}<div class="special-news-content"><span class="rot">Seção especial</span><h3 id="year-special-title">Final do ano chegando: deixe uma mensagem pro seu <span class="year-special-highlight">Docente nota 10!</span></h3><p class="special-news-lead">As melhores mensagens aparecerão aqui.</p><form id="year-message-form" class="year-message-form"><label>Professor homenageado<input name="professor" type="text" maxlength="120" required placeholder="Nome do professor"></label><label>Mensagem<textarea name="mensagem" maxlength="1000" minlength="10" rows="4" required placeholder="Escreva sua mensagem com carinho"></textarea></label><p class="year-message-privacy">O envio é anônimo. Se quiser, você pode se identificar no campo da mensagem. A mensagem será publicada somente após aprovação.</p><button class="btn year-message-submit" type="submit">Enviar mensagem</button><p id="year-message-status" class="year-message-status" role="status" aria-live="polite"></p></form>${messageCards ? `<div class="year-messages"><h4>Mensagens selecionadas</h4>${messageCards}</div>` : ''}</div></article></section>` : ''

  const sections = { noticias: otherNews, tecnologia: tech, datas: dates, extras, especial_fim_de_ano: special }
  const defaultOrder = ['noticias', 'tecnologia', 'datas', 'extras', 'especial_fim_de_ano']
  const savedOrder = Array.isArray(c.ordem_secoes) ? c.ordem_secoes.filter((key) => defaultOrder.includes(key)) : []
  const sectionOrder = [...savedOrder, ...defaultOrder.filter((key) => !savedOrder.includes(key))]
  $('out').innerHTML = (top + sectionOrder.map((key) => sections[key]).join('')) || '<p class="vazio">Esta edição ainda não tem conteúdo.</p>'

  // Links de navegação só para as seções que existem
  const orderedNav = sectionOrder.flatMap((key) => key === 'extras'
    ? ex.map((x) => [1, slug(x.secao || x.titulo), x.secao || x.titulo])
    : key === 'noticias' ? [[sec.length > 1, 'noticias', 'Outras notícias']]
      : key === 'tecnologia' ? [[te.length, 'tecnologia', 'Tecnologia']]
        : key === 'datas' ? [[da.length, 'datas', 'Datas']]
          : [[especialFimDeAno, 'especial-fim-de-ano', 'Especial de fim de ano']])
  const nav = [[p || sec.length === 1 || ev.length, 'destaque', p ? 'Destaque' : sec.length === 1 ? 'Notícias' : 'Eventos'], ...orderedNav]
  $('anchors').innerHTML = nav.filter((n) => n[0]).map((n) => `<a href="#${n[1]}" data-s="${n[1]}">${esc(n[2])}</a>`).join('')
  document.title = `Connecta TI – Edição ${e.numero}`
}

export function renderArticle(e, article, metrics = {}, liked = []) {
  const date = longDate(e.publicada_em)
  $('masthead').innerHTML = `<button class="admin-top" id="bAdm">Administrador</button><div class="article-mast"><a href="./#${encodeURIComponent(e.id)}">← Voltar ao jornal</a><span>CONNECTA TI · EDIÇÃO ${String(e.numero).padStart(2, '0')}</span><small>${esc(date)}</small></div>`
  $('ticker').hidden = true
  $('anchors').innerHTML = ''
  document.querySelector('.acts').hidden = true
  const sourceLink = /^https?:\/\//i.test(article.link || '') ? `<a class="ler-mais" href="${esc(article.link)}" target="_blank" rel="noopener noreferrer">Acessar matéria original <span aria-hidden="true">↗</span></a>` : ''
  $('out').innerHTML = `<article class="article-page"><span class="rot">Reportagem</span><h1>${esc(article.titulo)}</h1>${article.resumo ? `<p class="lead">${esc(article.resumo)}</p>` : ''}${foto(article.imagem, 'article-image', article.legenda, article.descricao_imagem || article.legenda || article.titulo)}${paras(article.texto_completo || article.texto)}${sourceLink}${articleStats(e, article, metrics, liked)}<p class="article-source">Connecta TI · Jornal dos cursos de TI do CIMATEC · ${esc(date)}</p></article>`
  document.title = `${article.titulo} — Connecta TI`
}

export function renderDateDetail(e, date) {
  const [day, month] = dm(date.data)
  const fullDate = new Date(`${date.data}T12:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  $('masthead').innerHTML = `<button class="admin-top" id="bAdm">Administrador</button><div class="article-mast"><a href="./#${encodeURIComponent(e.id)}">← Voltar ao jornal</a><span>CONNECTA TI · EDIÇÃO ${String(e.numero).padStart(2, '0')}</span><small>${esc(fullDate)}</small></div>`
  $('ticker').hidden = true
  $('anchors').innerHTML = ''
  document.querySelector('.acts').hidden = true
  $('out').innerHTML = `<article class="article-page date-page"><span class="rot">Agenda de tecnologia</span><div class="date-large"><b>${esc(day)}</b><span>${esc(month)}</span></div><h1>${esc(date.titulo)}</h1><p class="lead">Data importante no mundo da tecnologia.</p><p>Consulte os canais oficiais relacionados a esta data para conferir a programação e as informações mais recentes.</p>${date.link && /^https?:\/\//i.test(date.link) ? `<a class="ler-mais" href="${esc(date.link)}" target="_blank" rel="noopener noreferrer">Acessar informações relacionadas <span aria-hidden="true">↗</span></a>` : ''}<p class="article-source">Connecta TI · Jornal dos cursos de TI do CIMATEC</p></article>`
  document.title = `${date.titulo} — Connecta TI`
}
