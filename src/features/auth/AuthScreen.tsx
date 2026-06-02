import { useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthActions } from '../../queries/useAuth'
import { errorMessage } from '../../api/client'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

// Tela de entrada: login ou criar conta. Substitui o antigo "Novo jogo" anônimo.
export function AuthScreen() {
  const { t } = useTranslation()
  const { login, register } = useAuthActions()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const isRegister = mode === 'register'
  const active = isRegister ? register : login
  const busy = active.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    if (isRegister) register.mutate({ username, email, password })
    else login.mutate({ email, password })
  }

  return (
    <div style={center}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} style={card}>
        <h1 style={{ margin: 0, textAlign: 'center' }}>{t('app.title')}</h1>
        <p style={{ color: '#9aa3b2', margin: '4px 0 12px', textAlign: 'center' }}>{t('app.tagline')}</p>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}</h2>

        {isRegister && (
          <label style={field}>
            {t('auth.username')}
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={input} />
          </label>
        )}
        <label style={field}>
          {t('auth.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={input} />
        </label>
        <label style={field}>
          {t('auth.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            style={input}
          />
        </label>

        <button type="submit" disabled={busy} style={primary}>
          {busy ? t('auth.submitting') : isRegister ? t('auth.register') : t('auth.login')}
        </button>

        {active.isError && <p style={{ color: '#e0884a', margin: '4px 0 0', fontSize: 13 }}>{errorMessage(active.error)}</p>}

        <button
          type="button"
          onClick={() => setMode(isRegister ? 'login' : 'register')}
          style={linkBtn}
        >
          {isRegister ? t('auth.toLogin') : t('auth.toRegister')}
        </button>
      </form>
    </div>
  )
}

const center: CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#11141c',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
}

const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 320,
  padding: 24,
  background: 'rgba(17,20,28,0.95)',
  border: '1px solid #39415a',
  borderRadius: 12,
}

const field: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: '#9aa3b2',
  marginBottom: 10,
}

const input: CSSProperties = {
  padding: '8px 10px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#11141c',
  color: '#fff',
}

const primary: CSSProperties = {
  padding: '10px',
  fontSize: 15,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
  cursor: 'pointer',
  marginTop: 4,
}

const linkBtn: CSSProperties = {
  marginTop: 10,
  background: 'none',
  border: 'none',
  color: '#9aa3b2',
  cursor: 'pointer',
  fontSize: 13,
  textDecoration: 'underline',
}
