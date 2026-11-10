import { sb } from './supabase.js'
import { $, toast } from './util.js'

const EMAIL_ADMIN = 'ds.clube00@gmail.com'
const PRINCIPAL = [
  ['titulo', 'Título da notícia'], ['resumo', 'Resumo curto'], ['texto', 'Chamada exibida na capa', 'area'],
  ['texto_completo', 'Texto completo (opcional)', 'area'], ['imagem', 'URL da imagem (opcional)', 'image'],
  ['link', 'Link externo da notícia (opcional)', 'url']
]
const ESPECIAL = [['imagem', 'Imagem do especial', 'image']]
const LISTAS = {
  secundarias: ['Notícias secundárias', [['titulo', 'Título'], ['texto', 'Chamada', 'area'], ['texto_completo', 'Texto completo', 'area'], ['imagem', 'Imagem', 'image'], ['link', 'Link externo', 'url']]],
  eventos: ['Próximos eventos', [['titulo', 'Nome do evento'], ['data', 'Data', 'date'], ['local', 'Local ou link']]],
  tecnologia: ['Notícias de tecnologia', [['titulo', 'Título'], ['texto', 'Chamada', 'area'], ['texto_completo', 'Texto completo', 'area'], ['imagem', 'Imagem', 'image'], ['link', 'Link externo', 'url']]],
  datas: ['Datas importantes no mundo da tecnologia', [['data', 'Data', 'date'], ['titulo', 'O que acontece'], ['link', 'Link externo', 'url']], true],
  extras: ['Outras seções', [['secao', 'Nome da seção'], ['titulo', 'Título'], ['texto', 'Chamada', 'area'], ['texto_completo', 'Texto completo', 'area'], ['imagem', 'Imagem', 'image'], ['link', 'Link externo', 'url']]]
}

let aoPublicar = () => {}
let edicaoAtual = null
const msg = (texto) => { $('msg').textContent = texto }
const checarPermissao = () => sb.rpc('is_admin')
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function campo([nome, rotulo, tipo = 'text']) {
  if (tipo === 'image') return `<div class="admin-image"><label>${rotulo}<input data-f="imagem" type="url" placeholder="Cole aqui o link da imagem"></label><label class="file-pick">Anexar arquivo de imagem<input data-image-file type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label class="image-caption-field">Legenda da imagem (opcional)<input data-f="legenda" type="text" placeholder="Ex.: estudantes durante a atividade"></label><label class="image-caption-field">Descrição alternativa da imagem<input data-f="descricao_imagem" type="text" placeholder="Descreva o que é importante na imagem para leitores de tela"><small>Obrigatória quando a notícia tiver uma imagem; a legenda também pode servir como descrição.</small></label><div class="image-preview" aria-live="polite"></div></div>`
  if (tipo === 'area') return `<label class="rich-field">${rotulo}<span class="rich-toolbar" aria-label="Formatação do texto"><button type="button" data-format="bold" title="Negrito"><strong>B</strong></button><button type="button" data-format="italic" title="Itálico"><em>I</em></button><button type="button" data-format="link" title="Inserir link">↗ Link</button></span><textarea data-f="${nome}" rows="3" placeholder="Use os botões de formatação ou cole um link https://..."></textarea></label>`
  return `<label>${rotulo}<input data-f="${nome}" type="${tipo}"></label>`
}

function bindRichText(container) {
  container.querySelectorAll('.rich-field').forEach((field) => {
    const area = field.querySelector('textarea')
    field.querySelectorAll('[data-format]').forEach((button) => {
      button.onclick = () => {
        const format = button.dataset.format
        const start = area.selectionStart, end = area.selectionEnd
        const selected = area.value.slice(start, end)
        let before, after, replacement
        if (format === 'bold') { before = '**'; after = '**' }
        else if (format === 'italic') { before = '*'; after = '*' }
        else {
          const url = prompt('Cole o endereço do link (começando com https:// ou http://):')
          if (!url) return
          if (!/^https?:\/\//i.test(url.trim())) return msg('O endereço do link deve começar com http:// ou https://.')
          const label = selected || prompt('Qual texto deve aparecer como link?')
          if (!label) return
          replacement = `[${label}](${url.trim()})`
        }
        area.setRangeText(replacement ?? `${before}${selected}${after}`, start, end, 'select')
        if (format === 'link') area.setSelectionRange(start + replacement.length)
        area.focus()
      }
    })
  })
}

function preencher(container, dados = {}) {
  container.querySelectorAll('[data-f]').forEach((el) => { el.value = dados[el.dataset.f] || '' })
  const preview = container.querySelector('.image-preview')
  const image = container.querySelector('[data-f="imagem"]')
  if (preview && image?.value) preview.innerHTML = `<img src="${esc(image.value)}" alt="Prévia da imagem">`
}

function ler(container) {
  return Object.fromEntries([...container.querySelectorAll('[data-f]')].map((el) => [el.dataset.f, el.value.trim()]))
}

function articleCard(fields, data = {}, removable = false) {
  const el = document.createElement('div')
  el.className = 'admin-item'
  el.innerHTML = `<div class="admin-item-fields">${fields.map(campo).join('')}</div>${removable ? '<button type="button" class="btn cinza remove-item">Remover matéria</button>' : ''}`
  preencher(el, data)
  bindRichText(el)
  el.querySelector('[data-image-file]')?.addEventListener('change', (ev) => {
    const file = ev.target.files?.[0]
    const preview = el.querySelector('.image-preview')
    if (!file) return
    if (!file.type.startsWith('image/')) { msg('Selecione um arquivo de imagem válido.'); ev.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { msg('A imagem deve ter no máximo 5 MB.'); ev.target.value = ''; return }
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Prévia da imagem selecionada"><span>${esc(file.name)}</span>`
    msg('')
  })
  el.querySelector('.remove-item')?.addEventListener('click', () => el.remove())
  return el
}

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

function login(body) {
  body.innerHTML = `<section class="admin-login"><div class="admin-kicker">ÁREA RESTRITA</div><h2>Acessar o painel</h2><p>Entre com a conta administradora do Connecta TI.</p><label>E-mail<input id="em" type="email" autocomplete="username"></label><label>Senha<input id="pw" type="password" autocomplete="current-password"></label><button class="btn azul" id="go">Entrar</button></section>`
  $('go').onclick = async () => {
    const email = $('em').value.trim().toLowerCase()
    if (email !== EMAIL_ADMIN) return msg('Este painel está restrito à conta administradora autorizada.')
    const { error } = await sb.auth.signInWithPassword({ email, password: $('pw').value })
    if (error) return msg('E-mail ou senha incorretos.')
    const { data: autorizado, error: erroPermissao } = await checarPermissao()
    if (erroPermissao || autorizado !== true) {
      await sb.auth.signOut()
      return msg(erroPermissao ? 'Não foi possível validar o acesso. Confira se o SQL do projeto já foi executado.' : 'Esta conta não possui autorização de administrador no banco de dados.')
    }
    msg('')
    painel(body)
  }
}

function painel(body) {
  body.innerHTML = `<div class="admin-panel"><header class="admin-head"><div><div class="admin-kicker">CONNECTA TI · REDAÇÃO</div><h2>Gerenciar notícias</h2><p>Edite uma edição publicada ou prepare uma nova edição.</p></div><button type="button" class="admin-close" id="sair" aria-label="Sair do painel">×</button></header>
    <div class="admin-toolbar"><label>Editar edição publicada<select id="edition-picker"><option value="">Carregando edições…</option></select></label><button type="button" class="btn cinza" id="nova">＋ Nova edição</button></div>
    <div class="admin-status" id="edit-status">Nova edição</div>
    <div class="admin-meta"><label>Número da edição<input id="pn" type="number" min="1"></label><label>Ano<input id="pa" type="number" min="1" value="1"></label><label>Data de publicação<input id="pd" type="date"></label></div>
    <section class="admin-section principal-editor"><div class="section-heading"><span>01</span><div><h3>Matéria principal</h3><p>O destaque da capa do jornal.</p></div></div><div id="fp" class="admin-item">${PRINCIPAL.map(campo).join('')}</div></section>
    <section class="admin-section special-editor"><div class="section-heading"><span>★</span><div class="section-heading-copy"><h3>Imagem do especial de fim de ano</h3><p>Usada apenas no final da edição nº 1. Cole uma URL ou anexe uma imagem.</p></div></div><div id="fspecial" class="admin-item">${ESPECIAL.map(campo).join('')}</div></section>
    ${Object.entries(LISTAS).map(([key, [title, fields, single]]) => `<section class="admin-section" data-l="${key}"><div class="section-heading"><span>${String(Object.keys(LISTAS).indexOf(key) + 2).padStart(2, '0')}</span><div class="section-heading-copy"><h3>${title}</h3><p>${single ? 'Cadastre datas e links relacionados.' : 'Adicione quantas matérias precisar.'}</p></div><div class="section-heading-actions"><button type="button" class="btn cinza remove-section">Excluir seção</button></div></div><div class="rows"></div><button type="button" class="btn cinza add">＋ Adicionar ${single ? 'data' : 'matéria'}</button></section>`).join('')}
    <section class="admin-section year-messages-admin"><div class="section-heading"><span>08</span><div class="section-heading-copy"><h3>Mensagens do especial de fim de ano</h3><p>As mensagens são anónimas e só aparecem depois da aprovação.</p></div></div><div id="year-messages-admin-list" class="year-messages-admin-list"><p class="admin-empty">Carregando mensagens…</p></div></section>
    <div class="admin-footer-actions"><button class="btn cinza" id="cancelar">Fechar</button><button class="btn azul" id="pub">Salvar edição</button></div></div>`
  $('pd').valueAsDate = new Date()
  $('sair').onclick = async () => { await sb.auth.signOut(); $('dlg').close() }
  $('cancelar').onclick = () => $('dlg').close()
  $('nova').onclick = () => openEdition(null)

  body.querySelectorAll('fieldset[data-l],section[data-l]').forEach((section) => {
    const [title, fields, single] = LISTAS[section.dataset.l]
    section.querySelector('.add').onclick = () => section.querySelector('.rows').append(articleCard(fields, {}, true))
    section.querySelector('.remove-section').onclick = () => {
      const removed = section.dataset.removed === 'true'
      if (!removed && !confirm(`Excluir a seção "${title}" e todo o seu conteúdo desta edição?`)) return
      section.dataset.removed = String(!removed)
      section.classList.toggle('section-removed', !removed)
      section.querySelector('.rows').hidden = !removed
      section.querySelector('.add').hidden = !removed
      section.querySelector('.remove-section').textContent = removed ? 'Excluir seção' : 'Restaurar seção'
    }
  })
  bindRichText(body)
  body.querySelectorAll('[data-f="imagem"]').forEach((input) => input.addEventListener('input', () => {
    const preview = input.closest('.admin-image')?.querySelector('.image-preview')
    preview.innerHTML = input.value ? `<img src="${esc(input.value)}" alt="Prévia da imagem" onerror="this.parentElement.textContent='Não foi possível carregar esta imagem.'">` : ''
  }))
  $('edition-picker').onchange = async (ev) => {
    if (!ev.target.value) return
    const { data, error } = await sb.from('edicoes').select('*').eq('id', ev.target.value).single()
    if (error) return msg('Não foi possível abrir a edição: ' + error.message)
    openEdition(data)
  }
  body.querySelector('#year-messages-admin-list').addEventListener('click', moderateYearMessage)
  $('pub').onclick = saveEdition
  loadEditions()
  loadYearMessagesAdmin()
}

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
  const item = button.closest('[data-message-id]')
  const id = item?.dataset.messageId
  if (!id) return
  const action = button.dataset.messageAction
  if (action === 'delete' && !confirm('Excluir esta mensagem definitivamente?')) return
  button.disabled = true
  const result = action === 'delete'
    ? await sb.from('mensagens_fim_ano').delete().eq('id', id)
    : await sb.from('mensagens_fim_ano').update({ aprovada: action === 'approve' }).eq('id', id)
  if (result.error) msg('Não foi possível atualizar a mensagem: ' + result.error.message)
  else { toast(action === 'delete' ? 'Mensagem excluída.' : action === 'approve' ? 'Mensagem aprovada.' : 'Mensagem ocultada.'); await loadYearMessagesAdmin(); await aoPublicar() }
}

async function loadEditions() {
  const picker = $('edition-picker')
  const { data, error } = await sb.from('edicoes').select('id,numero,ano,publicada_em').order('publicada_em', { ascending: false })
  if (error) { picker.innerHTML = '<option value="">Erro ao carregar edições</option>'; return msg('Não foi possível listar as edições: ' + error.message) }
  picker.innerHTML = `<option value="">Selecione uma edição para editar</option>${(data || []).map((e) => `<option value="${esc(e.id)}">Edição ${String(e.numero).padStart(2, '0')} · ${esc(e.publicada_em)}</option>`).join('')}`
  if (data?.length) {
    const { data: full } = await sb.from('edicoes').select('*').eq('id', data[0].id).single()
    openEdition(full)
  } else openEdition(null)
}

function openEdition(edition) {
  edicaoAtual = edition
  const content = edition?.conteudo && !Array.isArray(edition.conteudo) ? edition.conteudo : {}
  $('edition-picker').value = edition?.id || ''
  $('edit-status').textContent = edition ? `Editando edição ${String(edition.numero).padStart(2, '0')}` : 'Nova edição'
  $('pub').textContent = edition ? 'Salvar alterações' : 'Publicar edição'
  $('pn').value = edition?.numero ?? ''
  $('pa').value = edition?.ano ?? 1
  $('pd').value = edition?.publicada_em || new Date().toISOString().slice(0, 10)
  preencher($('fp'), content.principal || {})
  preencher($('fspecial'), content.especial_fim_de_ano || {})
  document.querySelectorAll('#dlgBody section[data-l]').forEach((section) => {
    const key = section.dataset.l
    const rows = section.querySelector('.rows')
    section.dataset.removed = 'false'
    section.classList.remove('section-removed')
    section.querySelector('.remove-section').textContent = 'Excluir seção'
    section.querySelector('.rows').hidden = false
    section.querySelector('.add').hidden = false
    rows.replaceChildren()
    const records = Array.isArray(content[key]) ? content[key] : []
    records.forEach((item) => rows.append(articleCard(LISTAS[key][1], item, true)))
  })
  msg('')
}

async function saveEdition() {
  const button = $('pub')
  button.disabled = true
  button.textContent = 'Salvando…'
  try {
    const imageContainers = [$('fp'), $('fspecial'), ...document.querySelectorAll('#dlgBody section[data-l] .admin-item')]
    for (const container of imageContainers) {
      const hasImage = Boolean(container.querySelector('[data-f="imagem"]')?.value.trim() || container.querySelector('[data-image-file]')?.files?.[0])
      const alt = container.querySelector('[data-f="descricao_imagem"]')?.value.trim()
      const caption = container.querySelector('[data-f="legenda"]')?.value.trim()
      if (hasImage && !alt && !caption) {
        container.querySelector('[data-f="descricao_imagem"]')?.focus()
        return msg('Para cada imagem, preencha a descrição alternativa ou uma legenda descritiva para leitores de tela.')
      }
    }
    const content = { principal: await articleData($('fp')), especial_fim_de_ano: await articleData($('fspecial')) }
    const sections = [...document.querySelectorAll('#dlgBody section[data-l]')]
    for (const section of sections) {
      const key = section.dataset.l
      if (section.dataset.removed === 'true') {
        content[key] = []
        continue
      }
      const rows = [...section.querySelectorAll('.admin-item')]
      const records = []
      for (const row of rows) {
        const data = await articleData(row)
        if (Object.values(data).some(Boolean)) records.push(data)
      }
      content[key] = records
    }
    if (!$('pn').value || !content.principal.titulo) return msg('Informe o número da edição e o título da matéria principal.')
    const articles = [content.principal, ...content.secundarias, ...content.tecnologia, ...content.extras]
    const urls = [...articles.flatMap((item) => [item.link, item.imagem]), content.especial_fim_de_ano.imagem, ...content.datas.map((item) => item.link)]
    if (urls.some((url) => url && !/^https?:\/\//i.test(url))) return msg('Os links da notícia e da imagem devem começar com http:// ou https://.')
    const record = { numero: Number($('pn').value), ano: Number($('pa').value) || 1, publicada_em: $('pd').value, conteudo: content }
    let result
    if (edicaoAtual?.id) result = await sb.from('edicoes').update(record).eq('id', edicaoAtual.id).select().single()
    else result = await sb.from('edicoes').insert(record).select().single()
    if (result.error) return msg('Não foi possível salvar. Confira a autorização de administrador e os dados: ' + result.error.message)
    edicaoAtual = result.data
    await aoPublicar()
    await loadEditions()
    $('edition-picker').value = result.data.id
    openEdition(result.data)
    toast('Edição salva com sucesso!')
  } catch (error) {
    msg(error.message || 'Não foi possível salvar a edição.')
  } finally {
    button.disabled = false
    button.textContent = edicaoAtual ? 'Salvar alterações' : 'Publicar edição'
  }
}

export function initAdmin({ onPublished }) {
  aoPublicar = onPublished
  const body = $('dlgBody')
  $('bFechar').onclick = () => $('dlg').close()
  document.addEventListener('click', async (ev) => {
    if (!ev.target.closest('#bAdm')) return
    msg('')
    if (!sb) {
      body.innerHTML = '<h3>Supabase não configurado</h3><p>Configure as variáveis do Supabase para ativar o painel.</p>'
    } else {
      const { data } = await sb.auth.getSession()
      if (!data.session) login(body)
      else {
        const { data: autorizado, error } = await checarPermissao()
        if (error) { await sb.auth.signOut(); body.innerHTML = '<h3>Configuração incompleta</h3><p>Não foi possível validar o acesso. Confira o SQL do projeto.</p>' }
        else if (autorizado === true) painel(body)
        else { await sb.auth.signOut(); body.innerHTML = '<h3>Acesso restrito</h3><p>Esta conta não está autorizada para administrar o jornal.</p>' }
      }
    }
    $('dlg').showModal()
  })
}
