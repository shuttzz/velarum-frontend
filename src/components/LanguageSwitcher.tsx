import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

// Seletor de idioma. A preferência é persistida no localStorage pelo detector do i18n.
export function LanguageSwitcher({ style }: { style?: CSSProperties }) {
  const { i18n, t } = useTranslation()
  return (
    <select
      value={i18n.resolvedLanguage}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
      aria-label={t('common.language')}
      style={{ ...select, ...style }}
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

const select: CSSProperties = {
  padding: '4px 8px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
