import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '../api/auth'
import { useAuthActions, useMe } from '../queries/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'

// Controles de conta (idioma + saldo de Crônicas + sair), reusados no lobby e no HUD do jogo.
// O HUD do jogo (CityView/WorldMapView) NÃO passa `account` → buscamos via useMe() como fallback,
// senão o saldo de Crônicas e o nome não apareceriam no jogo.
export function AccountControls({ account: accountProp, style }: { account?: Account; style?: CSSProperties }) {
  const { t } = useTranslation()
  const me = useMe()
  const account = accountProp ?? me.data
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
