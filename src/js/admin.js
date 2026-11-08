import { sb } from './supabase.js'
import { $, toast } from './util.js'

const TXT = (n, l) => [n, l]
const AREA = (n, l) => [n, l, 'area']
const URL_ = (n) => [n, 'URL da imagem (opcional)', 'url']

const COMPLETO = AREA('texto_completo', 'Texto completo (opcional; exibido ao abrir “Ler mais”)')
const PRINCIPAL = [TXT('titulo', 'Título'), AREA('resumo', 'Resumo (uma ou duas frases)'), AREA('texto', 'Chamada (texto curto exibido na capa)'), COMPLETO, URL_('imagem')]
const LISTAS = {
  secundarias: ['Notícias secundárias', [TXT('titulo', 'Título'), AREA('texto', 'Chamada (texto curto exibido na capa)'), COMPLETO, URL_('imagem')]],
  eventos: ['Eventos', [TXT('titulo', 'Nome do evento'), ['data', 'Data', 'date'], TXT('local', 'Local')]],
  tecnologia: ['Notícias de tecnologia', [TXT('titulo', 'Título'), AREA('texto', 'Chamada (texto curto exibido na capa)'), COMPLETO, URL_('imagem')]],
  datas: ['Datas importantes', [['data', 'Data', 'date'], TXT('titulo', 'O que acontece'), URL_('link')]],
  extras: ['Seções extras (uma seção própria para uma notícia)', [TXT('secao', 'Nome da seção'), TXT('titulo', 'Título da notícia'), AREA('texto', 'Chamada (texto curto exibido na capa)'), COMPLETO, URL_('imagem')]]
}

const campo = ([n, l, t = 'text']) =>
  `<label>${l}${t === 'area' ? `<textarea data-f="${n}" rows="3"></textarea>` : `<input data-f="${n}" type="${t}">`}</label>`
const ler = (el) => Object.fromEntries([...el.querySelectorAll('[data-f]')].map((i) => [i.dataset.f, i.value.trim()]))
let aoPublicar = () => {}
const msg = (t) => ($('msg').textContent = t)

function login(body) {
  body.innerHTML = `<h3>Entrar como administrador</h3>
    <label>E-mail<input id="em" type="email" autocomplete="username"></label>
    <label>Senha<input id="pw" type="password" autocomplete="current-password"></label>
    <p><button class="btn azul" id="go">Entrar</button></p>`
  $('go').onclick = async () => {
    const { error } = await sb.auth.signInWithPassword({ email: $('em').value, password: $('pw').value })
    if (error) return msg('E-mail ou senha incorretos.')
    msg('')
    painel(body)
  }
}

function painel(body) {
  body.innerHTML = `<h3>Publicar nova edição</h3>
    <div class="duo"><label>Número<input id="pn" type="number" min="1"></label>
    <label>Ano do jornal<input id="pa" type="number" min="1" value="1"></label>
    <label>Data<input id="pd" type="date"></label></div>
    <fieldset id="fp"><legend>Notícia principal</legend>${PRINCIPAL.map(campo).join('')}</fieldset>
    ${Object.entries(LISTAS).map(([k, [t]]) => `<fieldset data-l="${k}"><legend>${t}</legend><div class="rows"></div><button type="button" class="btn cinza add">+ Adicionar</button></fieldset>`).join('')}
    <p><button class="btn azul" id="pub">Publicar edição</button> <button class="btn cinza" id="sair">Sair</button></p>`
  $('pd').valueAsDate = new Date()

  body.querySelectorAll('fieldset[data-l]').forEach((fs) => {
    const campos = LISTAS[fs.dataset.l][1]
    const add = () => {
      const d = document.createElement('div')
      d.className = 'row'
      d.innerHTML = campos.map(campo).join('') + '<button type="button" class="btn cinza">Remover</button>'
      d.querySelector('button').onclick = () => d.remove()
      fs.querySelector('.rows').append(d)
    }
    fs.querySelector('.add').onclick = add
  })

  $('sair').onclick = async () => { await sb.auth.signOut(); $('dlg').close() }
  $('pub').onclick = async () => {
    const conteudo = { principal: ler($('fp')) }
    body.querySelectorAll('fieldset[data-l]').forEach((fs) => {
      conteudo[fs.dataset.l] = [...fs.querySelectorAll('.row')].map(ler).filter((o) => Object.values(o).some(Boolean))
    })
    if (!$('pn').value || !conteudo.principal.titulo) return msg('Informe o número da edição e o título da notícia principal.')
    const { error } = await sb.from('edicoes').insert({ numero: +$('pn').value, ano: +$('pa').value, publicada_em: $('pd').value, conteudo })
    if (error) return msg('Não foi possível publicar (a conta é de administrador?): ' + error.message)
    $('dlg').close()
    toast('Edição publicada!')
    aoPublicar()
  }
}

export function initAdmin({ onPublished }) {
  aoPublicar = onPublished
  const body = $('dlgBody')
  $('bFechar').onclick = () => $('dlg').close()
  $('bAdm').onclick = async () => {
    msg('')
    if (!sb) {
      body.innerHTML = '<h3>Supabase não configurado</h3><p>Copie <code>.env.example</code> para <code>.env</code> e preencha as duas variáveis para habilitar login e publicação.</p>'
    } else {
      const { data } = await sb.auth.getSession()
      data.session ? painel(body) : login(body)
    }
    $('dlg').showModal()
  }
}
