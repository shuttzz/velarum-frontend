import { describe, it, expect, beforeEach } from 'vitest'
import { useGameUIStore } from './useGameUIStore'

beforeEach(() => {
  useGameUIStore.setState({ selectedBuildingId: null, buildMode: { type: 'idle' } })
})

describe('useGameUIStore', () => {
  it('startPlacing entra em modo placing e limpa a seleção', () => {
    useGameUIStore.getState().selectBuilding('b1')
    useGameUIStore.getState().startPlacing('viveiro_de_pedra')
    const s = useGameUIStore.getState()
    expect(s.buildMode).toEqual({ type: 'placing', buildingType: 'viveiro_de_pedra' })
    expect(s.selectedBuildingId).toBeNull()
  })

  it('selectBuilding sai do modo placing', () => {
    useGameUIStore.getState().startPlacing('x')
    useGameUIStore.getState().selectBuilding('b2')
    const s = useGameUIStore.getState()
    expect(s.buildMode).toEqual({ type: 'idle' })
    expect(s.selectedBuildingId).toBe('b2')
  })

  it('cancel reseta tudo', () => {
    useGameUIStore.getState().startPlacing('x')
    useGameUIStore.getState().cancel()
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'idle' })
    expect(useGameUIStore.getState().selectedBuildingId).toBeNull()
  })
})
