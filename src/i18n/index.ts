import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ptBRraw from './locales/pt-BR.json'
import enRaw from './locales/en.json'

// Em alguns ambientes (ex.: vitest) o import de JSON chega aninhado em `.default`;
// desembrulha defensivamente para que o i18next receba o objeto de traduções direto.
function unwrap(m: unknown): Record<string, unknown> {
  const x = m as { default?: Record<string, unknown> }
  return x.default ?? (m as Record<string, unknown>)
}
const ptBR = unwrap(ptBRraw)
const en = unwrap(enRaw)

// Idiomas suportados (rótulos no próprio idioma). pt-BR é o padrão/fallback.
export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português' },
  { code: 'en', label: 'English' },
] as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
    },
    fallbackLng: 'pt-BR',
    // 'en-US' do navegador cai no bundle 'en' pela cadeia de fallback do i18next; 'pt' e
    // qualquer não suportado caem em pt-BR. NÃO usar nonExplicitSupportedLngs: ele normaliza
    // 'pt-BR'→'pt' na busca interna e, sem bundle 'pt', o t() devolveria a própria chave.
    supportedLngs: ['pt-BR', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vela_lang',
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  })

export default i18n
