import { useState, type CSSProperties } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CityView } from './features/city/CityView'
import { AuthScreen } from './features/auth/AuthScreen'
import { AccountControls } from './components/AccountControls'
import { useCreateGame } from './queries/useGameMutations'
import { useMe } from './queries/useAuth'
import { errorMessage } from './api/client'
import { queryKeys } from './queries/keys'
import type { Account } from './api/auth'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  )
}

function Root() {
  const { t } = useTranslation()
  const me = useMe()

  if (me.isLoading) {
    return (
      <div style={center}>
        <p style={{ color: '#9aa3b2', fontFamily: 'system-ui, sans-serif' }}>{t('common.loading')}</p>
      </div>
    )
  }
  if (!me.data) return <AuthScreen />
  return <Authed account={me.data} />
}

// Logado: lobby com "Jogar" (entra no mundo) → CityView. EnterWorld é idempotente no backend.
function Authed({ account }: { account: Account }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [cityId, setCityId] = useState<string | null>(null)
  const enter = useCreateGame()

  function play() {
    enter.mutate(undefined, {
      onSuccess: (city) => {
        qc.setQueryData(queryKeys.city(city.id), city)
        setCityId(city.id)
      },
    })
  }

  if (cityId) return <CityView cityId={cityId} />

  return (
    <div style={center}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <AccountControls account={account} />
      </div>
      <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <h1>{t('app.title')}</h1>
        <p style={{ color: '#9aa3b2' }}>{t('app.tagline')}</p>
        <button onClick={play} disabled={enter.isPending} style={bigBtn}>
          {enter.isPending ? t('auth.playing') : t('auth.play')}
        </button>
        {enter.isError && <p style={{ color: '#e0884a' }}>{errorMessage(enter.error)}</p>}
      </div>
    </div>
  )
}

const center: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#11141c',
}

const bigBtn: CSSProperties = {
  padding: '10px 20px',
  fontSize: 16,
  borderRadius: 8,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
