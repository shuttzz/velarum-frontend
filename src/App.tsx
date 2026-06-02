import { useState, type CSSProperties } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { CityView } from './features/city/CityView'
import { useCreateGame } from './queries/useGameMutations'
import { queryKeys } from './queries/keys'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  )
}

function Root() {
  const qc = useQueryClient()
  const [cityId, setCityId] = useState<string | null>(null)
  const createGame = useCreateGame()

  function start() {
    createGame.mutate(undefined, {
      onSuccess: (city) => {
        qc.setQueryData(queryKeys.city(city.id), city)
        setCityId(city.id)
      },
    })
  }

  if (!cityId) {
    return (
      <div style={center}>
        <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Velarum</h1>
          <p style={{ color: '#9aa3b2' }}>Funde sua civilização e veja a cidade crescer.</p>
          <button onClick={start} disabled={createGame.isPending} style={bigBtn}>
            {createGame.isPending ? 'Criando…' : 'Novo jogo'}
          </button>
          {createGame.isError && <p style={{ color: 'crimson' }}>Erro ao criar o jogo.</p>}
        </div>
      </div>
    )
  }

  return <CityView cityId={cityId} />
}

const center: CSSProperties = {
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
