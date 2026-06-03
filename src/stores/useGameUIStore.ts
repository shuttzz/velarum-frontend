import { create } from 'zustand'

// Modo de interação com a grade.
export type BuildMode = { type: 'idle' } | { type: 'placing'; buildingType: string }

// Tela ativa do jogo (cidade ou mapa do mundo).
export type GameView = 'city' | 'map'

// Estado de UI puro (efêmero). NUNCA guarda dados do servidor — isso é do TanStack Query.
interface GameUIState {
  selectedBuildingId: string | null
  buildMode: BuildMode
  view: GameView
  selectBuilding: (id: string | null) => void
  startPlacing: (buildingType: string) => void
  cancel: () => void
  setView: (view: GameView) => void
}

export const useGameUIStore = create<GameUIState>((set) => ({
  selectedBuildingId: null,
  buildMode: { type: 'idle' },
  view: 'city',
  selectBuilding: (id) => set({ selectedBuildingId: id, buildMode: { type: 'idle' } }),
  startPlacing: (buildingType) => set({ buildMode: { type: 'placing', buildingType }, selectedBuildingId: null }),
  cancel: () => set({ buildMode: { type: 'idle' }, selectedBuildingId: null }),
  setView: (view) => set({ view }),
}))
