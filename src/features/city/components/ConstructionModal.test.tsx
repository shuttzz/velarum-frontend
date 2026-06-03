import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConstructionModal } from './ConstructionModal'
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
    def({ key: 'fogueira_comunal', name: 'Fogueira Comunal', requires: [{ building_key: 'lar_do_cla', level: 2 }] }),
  ],
  units: [],
}

const city: City = {
  id: 'c1',
  player_id: 'p1',
  name: 'Capital',
  era: 1,
  coord_x: 0,
  coord_y: 0,
  resources: { matter: 1000, energy: 1000, knowledge: 1000 },
  rate: { matter: 0, energy: 0, knowledge: 0 },
  capacity: { matter: 1000, energy: 1000, knowledge: 1000 },
  grid_w: 8,
  grid_h: 6,
  buildings: [{ id: 'b-lar', type: 'lar_do_cla', level: 1, x: 4, y: 3, w: 1, h: 1 }], // Lar já construído (máx. 1)
  pending: [],
  troops: [],
  recruits: [],
  army_cap: 0,
  marches: [],
  active_battle_id: '',
  server_now: '2026-06-03T00:00:00Z',
}

beforeEach(() => {
  useGameUIStore.setState({ selectedBuildingId: null, buildMode: { type: 'idle' }, editMode: false, view: 'city' })
})

function renderModal() {
  const onClose = vi.fn()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(queryKeys.catalog, catalog)
  render(
    <QueryClientProvider client={qc}>
      <ConstructionModal city={city} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose }
}

describe('ConstructionModal', () => {
  it('esconde edifícios no máximo de cópias (Lar do Clã já construído)', () => {
    renderModal()
    expect(screen.queryByText('Lar do Clã')).toBeNull()
  })

  it('clicar num disponível entra em placing e fecha o modal', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByText('Viveiro de Pedra'))
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'placing', buildingType: 'viveiro_de_pedra' })
    expect(onClose).toHaveBeenCalled()
  })

  it('edifício com pré-requisito não atendido fica desabilitado (não entra em placing)', () => {
    renderModal()
    fireEvent.click(screen.getByText('Fogueira Comunal'))
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'idle' })
  })
})
