import { $ } from './util.js'

const CONSENT_KEY = 'cti_optional_storage_consent_v1'
const TERMS_KEY = 'cti_terms_accepted_v1'
const TERMS_VERSION = '1.0'
const readJSON = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

export const hasAnalyticsConsent = () => {
  const choice = readJSON(CONSENT_KEY)
  const terms = readJSON(TERMS_KEY)
  return choice?.version === TERMS_VERSION && choice.optionalAnalytics === true && terms?.version === TERMS_VERSION
}

export function initPrivacyUI({ onConsentChange = () => {} } = {}) {
  const banner = $('cookie-banner')
  const termsCheck = $('terms-accept')
  const accept = $('cookie-accept')
  const reject = $('cookie-reject')
  const consent = readJSON(CONSENT_KEY)
  const acceptedTerms = readJSON(TERMS_KEY)

  function showPreferences() {
    termsCheck.checked = readJSON(TERMS_KEY)?.version === TERMS_VERSION
    accept.disabled = reject.disabled = !termsCheck.checked
    banner.hidden = false
    termsCheck.focus()
  }

  function syncTermsButtons() {
    accept.disabled = reject.disabled = !termsCheck.checked
  }

  function saveChoice(optionalAnalytics) {
    const now = new Date().toISOString()
    localStorage.setItem(TERMS_KEY, JSON.stringify({ version: TERMS_VERSION, acceptedAt: now }))
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: TERMS_VERSION, optionalAnalytics, updatedAt: now }))
    banner.hidden = true
    onConsentChange(optionalAnalytics)
  }

  if (!consent || consent.version !== TERMS_VERSION || acceptedTerms?.version !== TERMS_VERSION) showPreferences()
  termsCheck.addEventListener('change', syncTermsButtons)
  accept.addEventListener('click', () => { if (termsCheck.checked) saveChoice(true) })
  reject.addEventListener('click', () => {
    if (!termsCheck.checked) return
    // Recusar ou revogar a opção também apaga preferências locais de curtidas/métricas.
    localStorage.removeItem('cti_article_likes')
    localStorage.removeItem('cti_article_metrics')
    saveChoice(false)
  })
  $('cookie-settings').addEventListener('click', showPreferences)

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-legal]')
    if (!link) return
    event.preventDefault()
    const type = link.dataset.legal
    const template = $(`${type}-copy`)
    $('legal-title').textContent = type === 'privacy' ? 'Política de privacidade' : 'Termos de uso'
    $('legal-content').replaceChildren(template.content.cloneNode(true))
    $('legal-dialog').showModal()
  })
  $('legal-close').addEventListener('click', () => $('legal-dialog').close())
  $('legal-dialog').addEventListener('click', (event) => { if (event.target === $('legal-dialog')) $('legal-dialog').close() })

  const toggle = $('accessibility-toggle')
  const panel = $('accessibility-panel')
  const contrastButton = $('contrast-toggle')
  let isHighContrast = localStorage.getItem('cti_a11y_high_contrast') === 'true'
  let textScale = Number(localStorage.getItem('cti_a11y_text_scale') || 1)
  const applyContrast = () => {
    document.body.classList.toggle('high-contrast', isHighContrast)
    contrastButton.setAttribute('aria-pressed', String(isHighContrast))
    contrastButton.textContent = `Alto contraste: ${isHighContrast ? 'ligado' : 'desligado'}`
  }
  const applyTextScale = () => document.documentElement.style.setProperty('--access-font-size', `${Math.round(16 * textScale)}px`)
  applyContrast()
  applyTextScale()
  toggle.addEventListener('click', () => {
    const opening = !panel.open
    toggle.setAttribute('aria-expanded', String(opening))
    if (opening) { panel.showModal(); contrastButton.focus() }
  })
  $('accessibility-close').addEventListener('click', () => {
    panel.close()
  })
  panel.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.focus()
  })
  contrastButton.addEventListener('click', () => {
    isHighContrast = !isHighContrast
    localStorage.setItem('cti_a11y_high_contrast', String(isHighContrast))
    applyContrast()
  })
  $('text-smaller').addEventListener('click', () => {
    textScale = Math.max(.9, Math.round((textScale - .1) * 10) / 10)
    localStorage.setItem('cti_a11y_text_scale', String(textScale))
    applyTextScale()
  })
  $('text-larger').addEventListener('click', () => {
    textScale = Math.min(1.4, Math.round((textScale + .1) * 10) / 10)
    localStorage.setItem('cti_a11y_text_scale', String(textScale))
    applyTextScale()
  })
  $('text-reset').addEventListener('click', () => {
    textScale = 1
    localStorage.setItem('cti_a11y_text_scale', '1')
    applyTextScale()
  })
}
