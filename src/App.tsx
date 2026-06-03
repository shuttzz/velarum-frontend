import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CityView } from './features/city/CityView'
import { WorldMapView } from './features/world/WorldMapView'
import { ReportsOverlay } from './features/reports/ReportsOverlay'
import { AuthScreen } from './features/auth/AuthScreen'
import { AccountControls } from './components/AccountControls'
import { useGameUIStore } from './stores/useGameUIStore'
import { useEnterWorld } from './queries/useEnterWorld'
import { useCompletionRefetch } from './queries/useCompletionRefetch'
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

  if (me.isLoading) return <Centered>{t('common.loading')}</Centered>
  if (!me.data) return <AuthScreen />
  return <Game account={me.data} />
}

// Logado: entra AUTOMATICAMENTE no mundo e vai direto para a CityView. Assim o refresh não
// joga o usuário num lobby — ele volta direto para a sua cidade (mesma conta → mesma cidade).
function Game({ account }: { account: Account }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const enter = useEnterWorld()
  const view = useGameUIStore((s) => s.view)

  // Refetch automático quando uma tarefa conclui (contador zera) — em vez de esperar o poll.
  useCompletionRefetch(enter.data?.id ?? null)

  // Semeia o cache da cidade com o que a entrada já trouxe (evita um GET extra/flash).
  useEffect(() => {
    if (enter.data) qc.setQueryData(queryKeys.city(enter.data.id), enter.data)
  }, [enter.data, qc])

  if (enter.data) {
    const cityId = enter.data.id
    return (
      <>
        {view === 'map' ? <WorldMapView cityId={cityId} /> : <CityView cityId={cityId} />}
        <ReportsOverlay cityId={cityId} />
      </>
    )
  }

  // Falha ao entrar: nova tentativa + controles de conta (sair/idioma).
  if (enter.isError) {
    return (
      <Centered>
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <AccountControls account={account} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#e0884a' }}>{errorMessage(enter.error)}</p>
          <button onClick={() => void enter.refetch()} disabled={enter.isFetching} style={bigBtn}>
            {enter.isFetching ? t('auth.playing') : t('auth.play')}
          </button>
        </div>
      </Centered>
    )
  }

  return <Centered>{t('auth.playing')}</Centered>
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={center}>
      <div style={{ color: '#9aa3b2', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>{children}</div>
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
