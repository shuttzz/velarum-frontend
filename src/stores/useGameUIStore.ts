import { create } from 'zustand'

// Modo de interação com a grade.
export type BuildMode = { type: 'idle' } | { type: 'placing'; buildingType: string }

// Tela ativa do jogo (cidade ou mapa do mundo).
export type GameView = 'city' | 'map'

// Estado de UI puro (efêmero). NUNCA guarda dados do servidor — isso é do TanStack Query.
interface GameUIState {
  selectedBuildingId: string | null
  selectedPendingId: string | null // obra NOVA em andamento selecionada (build_queue id)
  buildMode: BuildMode
  view: GameView
  editMode: boolean // modo de edição de layout: só aqui é possível MOVER edifícios
  battleId: string | null // batalha tática aberta (overlay sobre o mapa)
  selectBuilding: (id: string | null) => void
  selectPending: (id: string | null) => void
  startPlacing: (buildingType: string) => void
  cancel: () => void
  setView: (view: GameView) => void
  toggleEdit: () => void
  openBattle: (id: string) => void
  closeBattle: () => void
}

export const useGameUIStore = create<GameUIState>((set) => ({
  selectedBuildingId: null,
  selectedPendingId: null,
  buildMode: { type: 'idle' },
  view: 'city',
  editMode: false,
  battleId: null,
  selectBuilding: (id) => set({ selectedBuildingId: id, selectedPendingId: null, buildMode: { type: 'idle' } }),
  selectPending: (id) => set({ selectedPendingId: id, selectedBuildingId: null, buildMode: { type: 'idle' } }),
  // Construir sai do modo edição (são interações distintas).
  startPlacing: (buildingType) =>
    set({ buildMode: { type: 'placing', buildingType }, selectedBuildingId: null, selectedPendingId: null, editMode: false }),
  cancel: () => set({ buildMode: { type: 'idle' }, selectedBuildingId: null, selectedPendingId: null }),
  setView: (view) => set({ view }),
  // Alterna o modo de edição; ao entrar/sair, limpa seleção e modo de construção.
  toggleEdit: () =>
    set((s) => ({ editMode: !s.editMode, selectedBuildingId: null, selectedPendingId: null, buildMode: { type: 'idle' } })),
  // Abre a batalha tática (overlay); força a vista de mapa por baixo.
  openBattle: (id) => set({ battleId: id, view: 'map' }),
  closeBattle: () => set({ battleId: null }),
}))
