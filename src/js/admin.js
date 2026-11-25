import { sb } from './supabase.js'
import { $, toast } from './util.js'

const EMAIL_ADMIN = 'ds.clube00@gmail.com'
const TIPOS_IMAGEM = 'image/jpeg,image/png,image/webp,image/gif'

// Cada campo: [nome, rótulo, tipo, dica]
const PRINCIPAL = [
  ['titulo', 'Título da notícia', 'text', 'Aparece em destaque na capa.'],
  ['resumo', 'Resumo curto', 'text', 'Uma frase que resume a notícia.'],
  ['texto', 'Chamada exibida na capa', 'area', 'Texto curto que aparece junto ao título, na capa.'],
  ['texto_completo', 'Texto completo (opcional)', 'area', 'Aparece na página da matéria, quando o leitor clica em “Ler mais”.'],
  ['imagem', 'Imagem (opcional)', 'image'],
  ['link', 'Link externo da notícia (opcional)', 'url', 'Se preenchido, o “Ler mais” abre este endereço em vez da página da matéria.']
]
const ESPECIAL = [['ativo', 'Exibir o especial de fim de ano nesta edição?', 'toggle'], ['imagem', 'Imagem do especial (opcional)', 'image']]
const NOTICIA = [
  ['titulo', 'Título'],
  ['texto', 'Chamada', 'area', 'Texto curto exibido no cartão da notícia.'],
  ['texto_completo', 'Texto completo (opcional)', 'area', 'Aparece na página da matéria, ao clicar em “Ler mais”.'],
  ['imagem', 'Imagem (opcional)', 'image'],
  ['link', 'Link externo (opcional)', 'url', 'Se preenchido, o “Ler mais” abre este endereço.']
]
const LISTAS = {
  secundarias: { titulo: 'Notícias secundárias', desc: 'Notícias que aparecem abaixo do destaque da capa.', item: 'Matéria', add: 'Adicionar matéria', campos: NOTICIA },
  tecnologia: { titulo: 'Notícias de tecnologia', desc: 'Novidades do mundo da tecnologia.', item: 'Matéria', add: 'Adicionar matéria', campos: NOTICIA },
  eventos: { titulo: 'Próximos eventos', desc: 'Eventos que aparecem na lista lateral da capa.', item: 'Evento', add: 'Adicionar evento', campos: [['titulo', 'Nome do evento'], ['data', 'Data', 'date'], ['local', 'Local ou link']] },
  datas: { titulo: 'Datas importantes no mundo da tecnologia', desc: 'Cadastre datas informativas, exibidas apenas para consulta.', item: 'Data', add: 'Adicionar data', campos: [['data', 'Data', 'date'], ['titulo', 'O que acontece']] },
  extras: { titulo: 'Outras seções', desc: 'Seções livres, com o nome que você escolher.', item: 'Seção', add: 'Adicionar seção', campos: [['secao', 'Nome da seção'], ...NOTICIA] }
}
const ORDEM_LISTAS = ['secundarias', 'tecnologia', 'eventos', 'datas', 'extras']
const ORDEM_SECOES = [['noticias', 'Outras notícias'], ['tecnologia', 'Tecnologia'], ['datas', 'Datas importantes'], ['extras', 'Outras seções'], ['especial_fim_de_ano', 'Especial de fim de ano']]

let edicaoAtual = null
let listaEdicoes = []
let alterado = false
let observador = null
let msgTimer

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const checarPermissao = () => sb.rpc('is_admin')

function msg(texto) {
  const el = $('msg')
  el.textContent = texto || ''
  el.classList.toggle('on', Boolean(texto))
  clearTimeout(msgTimer)
  if (texto) msgTimer = setTimeout(() => el.classList.remove('on'), 9000)
}

function marcarAlterado(valor = true) {
  alterado = valor
  const estado = $('save-state')
  if (!estado) return
  estado.textContent = valor ? '● Alterações não salvas' : '✓ Tudo salvo'
  estado.classList.toggle('dirty', valor)
}

const podeDescartar = () => !alterado || confirm('Há alterações não salvas nesta edição. Deseja descartá-las?')

function focar(el) {
  if (!el) return
  const card = el.closest('details')
  if (card) card.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.focus({ preventScroll: true })
}

/* ---------- Campos ---------- */

function campoImagem(rotulo) {
  return `<div class="admin-image wide"><span class="lbl">${esc(rotulo)}</span>
    <div class="img-pick"><label class="btn cinza file-pick">Anexar arquivo<input data-image-file type="file" accept="${TIPOS_IMAGEM}" hidden></label><span class="or">ou</span><input data-f="imagem" type="url" placeholder="Cole o link da imagem (https://…)" aria-label="Link da imagem"></div>
    <div class="image-preview" aria-live="polite"></div>
    <div class="img-extra">
      <label><span class="lbl">Descrição para leitores de tela</span><input data-f="descricao_imagem" type="text" placeholder="Descreva o que aparece na imagem"><small class="hint">Obrigatória quando há imagem (a legenda também serve).</small></label>
      <label><span class="lbl">Legenda (opcional)</span><input data-f="legenda" type="text" placeholder="Ex.: estudantes durante a atividade"></label>
    </div></div>`
}

function campo([nome, rotulo, tipo = 'text', dica = '']) {
  const hint = dica ? `<small class="hint">${esc(dica)}</small>` : ''
  if (tipo === 'toggle') return `<label class="special-toggle wide"><span class="lbl">${esc(rotulo)}</span><select data-f="${nome}"><option value="nao">Não exibir</option><option value="sim">Sim, exibir nesta edição</option></select></label>`
  if (tipo === 'image') return campoImagem(rotulo)
  if (tipo === 'area') return `<label class="rich-field wide"><span class="lbl">${esc(rotulo)}</span><span class="rich-toolbar" aria-label="Formatação do texto"><button type="button" data-format="bold" title="Negrito"><strong>B</strong></button><button type="button" data-format="italic" title="Itálico"><em>I</em></button><button type="button" data-format="link" title="Inserir link">↗ Link</button><button type="button" data-format="subtitle" title="Inserir subtítulo">H2 Subtítulo</button><button type="button" data-format="quote" title="Formatar citação">❝ Citação</button></span><textarea data-f="${nome}" rows="4" placeholder="Escreva aqui. Use os botões para formatar o texto."></textarea>${hint}<small class="hint">Subtítulo: selecione um trecho e clique em H2, ou insira um subtítulo. Citação: selecione o trecho e clique em Citação.</small></label>`
  return `<label><span class="lbl">${esc(rotulo)}</span><input data-f="${nome}" type="${tipo}">${hint}</label>`
}

function bindRichText(container) {
  container.querySelectorAll('.rich-field').forEach((field) => {
    const area = field.querySelector('textarea')
    field.querySelectorAll('[data-format]').forEach((button) => {
      button.onclick = (ev) => {
        ev.preventDefault()
        const format = button.dataset.format
        const start = area.selectionStart, end = area.selectionEnd
        const selected = area.value.slice(start, end)
        let replacement
        if (format === 'bold') replacement = `**${selected}**`
        else if (format === 'italic') replacement = `*${selected}*`
        else if (format === 'subtitle') replacement = `\n\n## ${(selected || 'Subtítulo').replace(/\s*\n\s*/g, ' ')}\n\n`
        else if (format === 'quote') replacement = `\n\n${(selected || 'Citação').split('\n').map((line) => `> ${line}`).join('\n')}\n\n`
        else {
          const url = prompt('Cole o endereço do link (começando com https:// ou http://):')
          if (!url) return
          if (!/^https?:\/\//i.test(url.trim())) return msg('O endereço do link deve começar com http:// ou https://.')
          const label = selected || prompt('Qual texto deve aparecer como link?')
          if (!label) return
          replacement = `[${label}](${url.trim()})`
        }
        area.setRangeText(replacement, start, end, 'select')
        if (format === 'link') area.setSelectionRange(start + replacement.length, start + replacement.length)
        area.focus()
        area.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
  })
}

function mostrarPrevia(container, src, nome) {
  const preview = container.querySelector('.image-preview')
  if (!preview) return
  preview.replaceChildren()
  if (!src) return
  const img = new Image()
  img.alt = 'Prévia da imagem'
  img.onerror = () => { preview.textContent = 'Não foi possível carregar esta imagem.' }
  img.src = src
  preview.append(img)
  if (nome) { const legenda = document.createElement('span'); legenda.textContent = nome; preview.append(legenda) }
}

function bindImagem(container) {
  const url = container.querySelector('[data-f="imagem"]')
  const arquivo = container.querySelector('[data-image-file]')
  if (!url || !arquivo) return
  url.addEventListener('input', () => mostrarPrevia(container, url.value.trim()))
  arquivo.addEventListener('change', (ev) => {
    const file = ev.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { msg('Selecione um arquivo de imagem válido.'); ev.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { msg('A imagem deve ter no máximo 5 MB.'); ev.target.value = ''; return }
    mostrarPrevia(container, URL.createObjectURL(file), file.name)
    msg('')
  })
}

function preencher(container, dados = {}) {
  container.querySelectorAll('[data-f]').forEach((el) => { el.value = dados[el.dataset.f] || '' })
  const imagem = container.querySelector('[data-f="imagem"]')
  if (imagem) mostrarPrevia(container, imagem.value)
}

const ler = (container) => Object.fromEntries([...container.querySelectorAll('[data-f]')].map((el) => [el.dataset.f, el.value.trim()]))

/* ---------- Cartões das matérias ---------- */

const rotuloCard = (el) => {
  const v = (n) => el.querySelector(`[data-f="${n}"]`)?.value.trim() || ''
  return v('titulo') || v('secao') || 'Sem título'
}

function atualizarLinhas(rows) {
  [...rows.children].forEach((row, index, items) => {
    row.querySelector('.adm-num').textContent = index + 1
    row.querySelector('.adm-title').textContent = rotuloCard(row)
    row.querySelector('[data-order="up"]').disabled = index === 0
    row.querySelector('[data-order="down"]').disabled = index === items.length - 1
  })
  atualizarContagens()
}

function atualizarContagens() {
  document.querySelectorAll('section[data-l]').forEach((section) => {
    const n = section.dataset.removed === 'true' ? 0 : section.querySelector('.rows').children.length
    document.querySelectorAll(`[data-count="${section.dataset.l}"]`).forEach((el) => { el.textContent = n ? `(${n})` : '' })
  })
}

function criarCard(cfg, dados = {}, aberto = true) {
  const el = document.createElement('details')
  el.className = 'admin-item adm-card'
  el.open = aberto
  el.innerHTML = `<summary><span class="adm-num"></span><span class="adm-title"></span><span class="adm-ctrl"><button type="button" class="adm-ico" data-order="up" aria-label="Mover ${esc(cfg.item.toLowerCase())} para cima" title="Mover para cima">↑</button><button type="button" class="adm-ico" data-order="down" aria-label="Mover ${esc(cfg.item.toLowerCase())} para baixo" title="Mover para baixo">↓</button><button type="button" class="adm-ico remove-item" aria-label="Remover ${esc(cfg.item.toLowerCase())}" title="Remover">✕</button></span></summary><div class="fields">${cfg.campos.map(campo).join('')}</div>`
  preencher(el, dados)
  bindRichText(el)
  bindImagem(el)
  el.querySelectorAll('[data-order]').forEach((button) => button.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation()
    const rows = el.parentElement
    if (button.dataset.order === 'up' && el.previousElementSibling) rows.insertBefore(el, el.previousElementSibling)
    if (button.dataset.order === 'down' && el.nextElementSibling) rows.insertBefore(el.nextElementSibling, el)
    atualizarLinhas(rows)
    marcarAlterado()
  }))
  el.querySelector('.remove-item').addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation()
    const preenchido = Object.values(ler(el)).some(Boolean)
    if (preenchido && !confirm(`Remover ${cfg.item.toLowerCase()} “${rotuloCard(el)}”?`)) return
    const rows = el.parentElement
    el.remove()
    atualizarLinhas(rows)
    marcarAlterado()
  })
  return el
}

/* ---------- Ordem das seções ---------- */

function atualizarOrdemSecoes(rows) {
  [...rows.children].forEach((row, index, items) => {
    row.querySelector('[data-section-order="up"]').disabled = index === 0
    row.querySelector('[data-section-order="down"]').disabled = index === items.length - 1
  })
}

function criarLinhaOrdemSecao([key, title]) {
  const row = document.createElement('div')
  row.className = 'section-order-item'
  row.dataset.sectionKey = key
  row.innerHTML = `<strong>${esc(title)}</strong><div class="adm-ctrl"><button type="button" class="adm-ico" data-section-order="up" aria-label="Mover ${esc(title)} para cima" title="Mover para cima">↑</button><button type="button" class="adm-ico" data-section-order="down" aria-label="Mover ${esc(title)} para baixo" title="Mover para baixo">↓</button></div>`
  row.querySelectorAll('[data-section-order]').forEach((button) => button.addEventListener('click', () => {
    const rows = row.parentElement
    if (button.dataset.sectionOrder === 'up' && row.previousElementSibling) rows.insertBefore(row, row.previousElementSibling)
    if (button.dataset.sectionOrder === 'down' && row.nextElementSibling) rows.insertBefore(row.nextElementSibling, row)
    atualizarOrdemSecoes(rows)
    marcarAlterado()
  }))
  return row
}

/* ---------- Imagens ---------- */

async function uploadImage(container) {
  const article = ler(container)
  const file = container.querySelector('[data-image-file]')?.files?.[0]
  if (!file) return article
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
  const { error } = await sb.storage.from('connecta-ti-images').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Falha ao enviar ${file.name}: ${error.message}`)
  article.imagem = sb.storage.from('connecta-ti-images').getPublicUrl(path).data.publicUrl
  return article
}

async function articleData(container) {
  const fileInput = container.querySelector('[data-image-file]')
  const hasFile = Boolean(fileInput?.files?.[0])
  const data = await uploadImage(container)
  if (hasFile) {
    const imageInput = container.querySelector('[data-f="imagem"]')
    if (imageInput) imageInput.value = data.imagem
    fileInput.value = ''
  }
  return data
}

/* ---------- Login e painel ---------- */

function aviso(root, titulo, texto, comLogin = true) {
  root.innerHTML = `<section class="adm-login"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>${comLogin ? '<button type="button" class="btn azul" id="voltar-login">Entrar com outra conta</button>' : ''}</section>`
  if (comLogin) $('voltar-login').onclick = () => login(root)
}

function login(root) {
  $('sair').hidden = true
  root.innerHTML = `<section class="adm-login"><div class="admin-kicker">ÁREA RESTRITA</div><h1>Entrar no painel</h1><p>Use a conta administradora do Connecta TI para criar e editar notícias.</p><form id="login-form"><label><span class="lbl">E-mail</span><input id="em" type="email" autocomplete="username" required></label><label><span class="lbl">Senha</span><input id="pw" type="password" autocomplete="current-password" required></label><button class="btn azul" id="go" type="submit">Entrar</button></form></section>`
  $('em').focus()
  $('login-form').onsubmit = async (ev) => {
    ev.preventDefault()
    const button = $('go')
    const email = $('em').value.trim().toLowerCase()
    if (email !== EMAIL_ADMIN) return msg('Este painel está restrito à conta administradora autorizada.')
    button.disabled = true
    button.textContent = 'Entrando…'
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: $('pw').value })
      if (error) return msg('E-mail ou senha incorretos.')
      const { data: autorizado, error: erroPermissao } = await checarPermissao()
      if (erroPermissao || autorizado !== true) {
        await sb.auth.signOut()
        return msg(erroPermissao ? 'Não foi possível validar o acesso. Confira se o SQL do projeto já foi executado.' : 'Esta conta não possui autorização de administrador no banco de dados.')
      }
      msg('')
      painel(root)
    } finally {
      button.disabled = false
      button.textContent = 'Entrar'
    }
  }
}

function painel(root) {
  const secoes = [
    ['meta', 'Dados da edição'], ['principal', 'Matéria principal'],
    ...ORDEM_LISTAS.map((key) => [key, LISTAS[key].titulo, key]),
    ['especial', 'Especial de fim de ano'], ['ordem', 'Ordem das seções'], ['mensagens', 'Mensagens do especial']
  ]
  const num = (id) => String(secoes.findIndex(([x]) => x === id) + 1).padStart(2, '0')
  const heading = (id, titulo, desc, extra = '') => `<div class="section-heading"><span>${num(id)}</span><div class="section-heading-copy"><h2>${esc(titulo)} <em class="count" data-count="${id}"></em></h2><p>${esc(desc)}</p></div>${extra}</div>`

  root.innerHTML = `<div class="adm-intro"><h1>Gerenciar notícias</h1><p>Escolha uma edição para editar ou crie uma nova. Preencha cada parte do jornal abaixo e clique em <strong>Salvar edição</strong> quando terminar.</p></div>
  <div class="adm-layout">
    <nav class="adm-side" aria-label="Partes da edição"><p class="adm-side-title">Nesta edição</p>${secoes.map(([id, titulo, key]) => `<a href="#sec-${id}" data-nav="sec-${id}"><span class="n">${num(id)}</span><b>${esc(titulo)}</b>${key ? `<em data-count="${key}"></em>` : ''}</a>`).join('')}</nav>
    <div class="adm-main">
      <section class="admin-section" id="sec-meta">${heading('meta', 'Dados da edição', 'Qual edição você está editando e quando ela é publicada.')}
        <div class="adm-toolbar"><label><span class="lbl">Edição</span><select id="edition-picker"><option value="">Carregando edições…</option></select></label><button type="button" class="btn cinza" id="nova">＋ Nova edição</button></div>
        <div class="admin-status" id="edit-status">Nova edição</div>
        <div class="adm-meta"><label><span class="lbl">Número da edição</span><input id="pn" type="number" min="1"></label><label><span class="lbl">Ano</span><input id="pa" type="number" min="1" value="1"></label><label><span class="lbl">Data de publicação</span><input id="pd" type="date"></label></div>
      </section>
      <section class="admin-section principal-editor" id="sec-principal">${heading('principal', 'Matéria principal', 'O destaque da capa do jornal.')}<div id="fp" class="admin-item plain"><div class="fields">${PRINCIPAL.map(campo).join('')}</div></div></section>
      ${ORDEM_LISTAS.map((key) => `<section class="admin-section" id="sec-${key}" data-l="${key}">${heading(key, LISTAS[key].titulo, LISTAS[key].desc, '<div class="section-heading-actions"><button type="button" class="btn ghost remove-section">Excluir seção</button></div>')}<div class="rows"></div><button type="button" class="adm-add add">＋ ${esc(LISTAS[key].add)}</button></section>`).join('')}
      <section class="admin-section special-editor" id="sec-especial">${heading('especial', 'Especial de fim de ano', 'Escolha em qual edição o especial aparece. Opcionalmente, cole uma URL ou anexe uma imagem.')}<div id="fspecial" class="admin-item plain"><div class="fields">${ESPECIAL.map(campo).join('')}</div></div></section>
      <section class="admin-section section-order-editor" id="sec-ordem">${heading('ordem', 'Ordem das seções no jornal', 'Use as setas para escolher a sequência das seções exibidas abaixo do destaque.')}<div id="section-order-list" class="section-order-list"></div></section>
      <section class="admin-section year-messages-admin" id="sec-mensagens">${heading('mensagens', 'Mensagens do especial de fim de ano', 'As mensagens são anônimas e só aparecem no jornal depois da aprovação.')}<div id="year-messages-admin-list" class="year-messages-admin-list"><p class="admin-empty">Carregando mensagens…</p></div></section>
    </div>
  </div>
  <div class="adm-savebar"><div class="adm-savebar-in"><span id="save-state" class="save-state">✓ Tudo salvo</span><span class="grow"></span><button class="btn azul" id="pub" type="button">Salvar edição</button></div></div>`

  $('sair').hidden = false
  $('sair').onclick = async () => {
    if (!podeDescartar()) return
    await sb.auth.signOut()
    marcarAlterado(false)
    login(root)
  }
  $('nova').onclick = () => { if (podeDescartar()) openEdition(null) }
  $('edition-picker').onchange = async (ev) => {
    if (!podeDescartar()) { ev.target.value = edicaoAtual?.id || ''; return }
    if (!ev.target.value) return openEdition(null)
    const { data, error } = await sb.from('edicoes').select('*').eq('id', ev.target.value).single()
    if (error) return msg('Não foi possível abrir a edição: ' + error.message)
    openEdition(data)
  }
  $('pub').onclick = saveEdition

  const ordem = $('section-order-list')
  ORDEM_SECOES.forEach((item) => ordem.append(criarLinhaOrdemSecao(item)))
  atualizarOrdemSecoes(ordem)

  ;[$('fp'), $('fspecial')].forEach((container) => { bindRichText(container); bindImagem(container) })

  root.querySelectorAll('section[data-l]').forEach((section) => {
    const cfg = LISTAS[section.dataset.l]
    const rows = section.querySelector('.rows')
    section.dataset.removed = 'false'
    section.querySelector('.add').onclick = () => {
      const card = criarCard(cfg)
      rows.append(card)
      atualizarLinhas(rows)
      marcarAlterado()
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      card.querySelector('[data-f]')?.focus({ preventScroll: true })
    }
    section.querySelector('.remove-section').onclick = () => {
      const removed = section.dataset.removed === 'true'
      if (!removed && !confirm(`Excluir a seção "${cfg.titulo}" e todo o seu conteúdo desta edição?`)) return
      section.dataset.removed = String(!removed)
      section.classList.toggle('section-removed', !removed)
      rows.hidden = !removed
      section.querySelector('.add').hidden = !removed
      section.querySelector('.remove-section').textContent = removed ? 'Excluir seção' : 'Restaurar seção'
      atualizarContagens()
      marcarAlterado()
    }
  })

  // Qualquer digitação ou escolha marca a edição como alterada e atualiza o título do cartão
  root.addEventListener('input', (ev) => {
    marcarAlterado()
    const card = ev.target.closest('.adm-card')
    if (card && ev.target.matches('[data-f="titulo"],[data-f="secao"]')) card.querySelector('.adm-title').textContent = rotuloCard(card)
  })
  root.addEventListener('change', () => marcarAlterado())

  // Destaca no menu lateral a parte que está na tela
  observador?.disconnect()
  const links = new Map([...root.querySelectorAll('[data-nav]')].map((a) => [a.dataset.nav, a]))
  observador = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return
    links.forEach((a) => a.classList.remove('on'))
    links.get(entry.target.id)?.classList.add('on')
  }), { rootMargin: '-15% 0px -70% 0px' })
  root.querySelectorAll('section[id^="sec-"]').forEach((s) => observador.observe(s))

  $('year-messages-admin-list').addEventListener('click', moderateYearMessage)
  loadEditions()
  loadYearMessagesAdmin()
}

/* ---------- Mensagens do especial ---------- */

async function loadYearMessagesAdmin() {
  const list = $('year-messages-admin-list')
  if (!list) return
  const { data, error } = await sb.from('mensagens_fim_ano').select('id, professor, mensagem, aprovada, criada_em').order('criada_em', { ascending: false })
  if (error) { list.innerHTML = '<p class="admin-empty">Não foi possível carregar as mensagens. Execute o SQL atualizado.</p>'; return }
  if (!data?.length) { list.innerHTML = '<p class="admin-empty">Ainda não há mensagens recebidas.</p>'; return }
  list.innerHTML = data.map((item) => `<article class="year-message-admin-item" data-message-id="${esc(item.id)}"><div><strong>Para ${esc(item.professor)}</strong><p>${esc(item.mensagem)}</p><small>${item.aprovada ? 'Publicada' : 'Pendente de aprovação'} · ${esc(new Date(item.criada_em).toLocaleString('pt-BR'))}</small></div><div class="year-message-admin-actions">${item.aprovada ? '<button type="button" class="btn cinza" data-message-action="unapprove">Ocultar</button>' : '<button type="button" class="btn azul" data-message-action="approve">Aprovar</button>'}<button type="button" class="btn cinza" data-message-action="delete">Excluir</button></div></article>`).join('')
}

async function moderateYearMessage(ev) {
  const button = ev.target.closest('[data-message-action]')
  if (!button) return
  const id = button.closest('[data-message-id]')?.dataset.messageId
  if (!id) return
  const action = button.dataset.messageAction
  if (action === 'delete' && !confirm('Excluir esta mensagem definitivamente?')) return
  button.disabled = true
  const result = action === 'delete'
    ? await sb.from('mensagens_fim_ano').delete().eq('id', id)
    : await sb.from('mensagens_fim_ano').update({ aprovada: action === 'approve' }).eq('id', id)
  if (result.error) { msg('Não foi possível atualizar a mensagem: ' + result.error.message); button.disabled = false }
  else { toast(action === 'delete' ? 'Mensagem excluída.' : action === 'approve' ? 'Mensagem aprovada.' : 'Mensagem ocultada.'); await loadYearMessagesAdmin() }
}

/* ---------- Edições ---------- */

async function loadEditions(selectId) {
  const picker = $('edition-picker')
  const { data, error } = await sb.from('edicoes').select('id,numero,ano,publicada_em').order('publicada_em', { ascending: false })
  if (error) { picker.innerHTML = '<option value="">Erro ao carregar edições</option>'; return msg('Não foi possível listar as edições: ' + error.message) }
  listaEdicoes = data || []
  picker.innerHTML = `<option value="">Nova edição (ainda não salva)</option>${listaEdicoes.map((e) => `<option value="${esc(e.id)}">Edição ${String(e.numero).padStart(2, '0')} · ${esc(e.publicada_em)}</option>`).join('')}`
  const alvo = selectId ?? listaEdicoes[0]?.id
  if (!alvo) return openEdition(null)
  const { data: full, error: erroEdicao } = await sb.from('edicoes').select('*').eq('id', alvo).single()
  if (erroEdicao) return msg('Não foi possível abrir a edição: ' + erroEdicao.message)
  openEdition(full)
}

function openEdition(edition) {
  edicaoAtual = edition
  const content = edition?.conteudo && !Array.isArray(edition.conteudo) ? edition.conteudo : {}
  $('edition-picker').value = edition?.id || ''
  $('edit-status').textContent = edition ? `Editando edição ${String(edition.numero).padStart(2, '0')}` : 'Nova edição'
  $('pub').textContent = edition ? 'Salvar alterações' : 'Publicar edição'
  $('pn').value = edition?.numero ?? (Math.max(0, ...listaEdicoes.map((e) => Number(e.numero) || 0)) + 1)
  $('pa').value = edition?.ano ?? 1
  $('pd').value = edition?.publicada_em || new Date().toISOString().slice(0, 10)
  preencher($('fp'), content.principal || {})
  const especial = { ...(content.especial_fim_de_ano || {}) }
  if (!especial.ativo) especial.ativo = !edition || especial.ativo === undefined ? (Number(edition?.numero) === 1 ? 'sim' : 'nao') : 'nao'
  preencher($('fspecial'), especial)
  const sectionOrder = Array.isArray(content.ordem_secoes) ? content.ordem_secoes : []
  const sortedOrder = [...sectionOrder.filter((key) => ORDEM_SECOES.some(([id]) => id === key)), ...ORDEM_SECOES.map(([key]) => key).filter((key) => !sectionOrder.includes(key))]
  const orderList = $('section-order-list')
  orderList.replaceChildren(...sortedOrder.map((key) => criarLinhaOrdemSecao(ORDEM_SECOES.find(([id]) => id === key))))
  atualizarOrdemSecoes(orderList)
  document.querySelectorAll('section[data-l]').forEach((section) => {
    const key = section.dataset.l
    const rows = section.querySelector('.rows')
    section.dataset.removed = 'false'
    section.classList.remove('section-removed')
    section.querySelector('.remove-section').textContent = 'Excluir seção'
    rows.hidden = false
    section.querySelector('.add').hidden = false
    rows.replaceChildren()
    const records = Array.isArray(content[key]) ? content[key] : []
    // Edições já preenchidas abrem com os cartões fechados: dá para ver tudo de relance
    records.forEach((item) => rows.append(criarCard(LISTAS[key], item, false)))
    atualizarLinhas(rows)
  })
  msg('')
  marcarAlterado(false)
}

async function saveEdition() {
  const button = $('pub')
  if (button.disabled) return
  const tituloPrincipal = $('fp').querySelector('[data-f="titulo"]')
  if (!$('pn').value || !tituloPrincipal.value.trim()) {
    focar($('pn').value ? tituloPrincipal : $('pn'))
    return msg('Informe o número da edição e o título da matéria principal.')
  }
  button.disabled = true
  button.textContent = 'Salvando…'
  try {
    const imageContainers = [$('fp'), $('fspecial'), ...document.querySelectorAll('section[data-l] .admin-item')]
    for (const container of imageContainers) {
      const hasImage = Boolean(container.querySelector('[data-f="imagem"]')?.value.trim() || container.querySelector('[data-image-file]')?.files?.[0])
      const alt = container.querySelector('[data-f="descricao_imagem"]')?.value.trim()
      const caption = container.querySelector('[data-f="legenda"]')?.value.trim()
      if (hasImage && !alt && !caption) {
        focar(container.querySelector('[data-f="descricao_imagem"]'))
        return msg('Para cada imagem, preencha a descrição alternativa ou uma legenda descritiva para leitores de tela.')
      }
    }
    const content = { principal: await articleData($('fp')), especial_fim_de_ano: await articleData($('fspecial')), ordem_secoes: [...$('section-order-list').children].map((row) => row.dataset.sectionKey) }
    for (const section of document.querySelectorAll('section[data-l]')) {
      const key = section.dataset.l
      if (section.dataset.removed === 'true') { content[key] = []; continue }
      const records = []
      for (const row of section.querySelectorAll('.admin-item')) {
        const data = await articleData(row)
        if (Object.values(data).some(Boolean)) records.push(data)
      }
      content[key] = records
    }
    const articles = [content.principal, ...content.secundarias, ...content.tecnologia, ...content.extras]
    const urls = [...articles.flatMap((item) => [item.link, item.imagem]), content.especial_fim_de_ano.imagem, ...content.datas.map((item) => item.link)]
    if (urls.some((url) => url && !/^https?:\/\//i.test(url))) return msg('Os links da notícia e da imagem devem começar com http:// ou https://.')
    const record = { numero: Number($('pn').value), ano: Number($('pa').value) || 1, publicada_em: $('pd').value, conteudo: content }
    const result = edicaoAtual?.id
      ? await sb.from('edicoes').update(record).eq('id', edicaoAtual.id).select().single()
      : await sb.from('edicoes').insert(record).select().single()
    if (result.error) return msg('Não foi possível salvar. Confira a autorização de administrador e os dados: ' + result.error.message)
    await loadEditions(result.data.id)
    toast('Edição salva com sucesso!')
  } catch (error) {
    msg(error.message || 'Não foi possível salvar a edição.')
  } finally {
    button.disabled = false
    button.textContent = edicaoAtual ? 'Salvar alterações' : 'Publicar edição'
  }
}

/* ---------- Início ---------- */

export async function initAdmin() {
  const root = $('adminRoot')
  window.addEventListener('beforeunload', (ev) => { if (alterado) { ev.preventDefault(); ev.returnValue = '' } })
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's' && $('pub')) { ev.preventDefault(); saveEdition() }
  })
  $('msg').onclick = () => msg('')
  if (!sb) return aviso(root, 'Supabase não configurado', 'Configure as variáveis do Supabase para ativar o painel.', false)
  const { data } = await sb.auth.getSession()
  if (!data.session) return login(root)
  const { data: autorizado, error } = await checarPermissao()
  if (error) { await sb.auth.signOut(); return aviso(root, 'Configuração incompleta', 'Não foi possível validar o acesso. Confira o SQL do projeto.') }
  if (autorizado === true) return painel(root)
  await sb.auth.signOut()
  aviso(root, 'Acesso restrito', 'Esta conta não está autorizada para administrar o jornal.')
}
