import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BuildPalette } from './BuildPalette'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { queryKeys } from '../../../queries/keys'
import type { Catalog, CatalogBuilding, City } from '../../../types/game'

const def = (over: Partial<CatalogBuilding>): CatalogBuilding => ({
  key: 'x',
  name: 'X',
  category: 'production',
  produces: '',
  base_rate: 0,
  base_cost: { matter: 10, energy: 0, knowledge: 0 },
  base_time: 30,
  max_copies: 3,
  era: 1,
  w: 1,
  h: 1,
  requires: [],
  ...over,
})

const catalog: Catalog = {
  growth: { production: 1.55, cost: 1.65, build_time: 1.8 },
  buildings: [
    def({ key: 'lar_do_cla', name: 'Lar do Clã', category: 'central', max_copies: 1 }),
    def({ key: 'viveiro_de_pedra', name: 'Viveiro de Pedra' }),
    def({ key: 'celeiro_de_argila', name: 'Celeiro de Argila' }),
    def({ key: 'fogueira_comunal', name: 'Fogueira Comunal', requires: [{ building_key: 'lar_do_cla', level: 2 }] }),
  ],
}

const city: City = {
  id: 'c1',
  player_id: 'p1',
  name: 'Capital',
  era: 1,
  resources: { matter: 1000, energy: 1000, knowledge: 1000 },
  rate: { matter: 0, energy: 0, knowledge: 0 },
  capacity: { matter: 1000, energy: 1000, knowledge: 1000 },
  grid_w: 8,
  grid_h: 6,
  buildings: [],
  pending: [],
  server_now: '2026-06-02T00:00:00Z',
}

function renderPalette() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(queryKeys.catalog, catalog)
  return render(
    <QueryClientProvider client={qc}>
      <BuildPalette city={city} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useGameUIStore.setState({ selectedBuildingId: null, buildMode: { type: 'idle' } })
})

describe('BuildPalette', () => {
  it('clicar num edifício disponível entra em modo de construção (placing)', () => {
    renderPalette()
    fireEvent.click(screen.getByText('Viveiro de Pedra'))
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'placing', buildingType: 'viveiro_de_pedra' })
  })

  it('mostra a dica de clicar numa célula quando em placing', () => {
    renderPalette()
    fireEvent.click(screen.getByText('Celeiro de Argila'))
    expect(screen.getByText(/Clique numa célula vazia/)).toBeInTheDocument()
  })

  it('trava edifício com pré-requisito não atendido e mostra o que falta', () => {
    renderPalette()
    expect(screen.getByText(/requer Lar do Clã nv2/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Fogueira Comunal'))
    // continua idle: o botão está desabilitado
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'idle' })
  })
})
