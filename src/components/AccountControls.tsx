import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '../api/auth'
import { useAuthActions } from '../queries/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'

// Controles de conta (idioma + sair), reusados no lobby e no HUD do jogo.
export function AccountControls({ account, style }: { account?: Account; style?: CSSProperties }) {
  const { t } = useTranslation()
  const { logout } = useAuthActions()
  return (
    <div style={{ ...row, ...style }}>
      {account && <span style={{ color: '#9aa3b2', fontSize: 13 }}>{t('auth.welcome', { name: account.username })}</span>}
      {account && (
        <span style={premiumChip} title={t('auth.chroniclesTip')}>
          🔮 {t('auth.chronicles', { n: account.premium })}
        </span>
      )}
      <LanguageSwitcher />
      <button onClick={() => logout.mutate()} disabled={logout.isPending} style={btn}>
        {t('auth.logout')}
      </button>
    </div>
  )
}

const premiumChip: CSSProperties = {
  fontSize: 13,
  color: '#e9d27a',
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #5a4f2a',
  background: 'rgba(120,100,30,0.18)',
  whiteSpace: 'nowrap',
}

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'system-ui, sans-serif',
}

const btn: CSSProperties = {
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
