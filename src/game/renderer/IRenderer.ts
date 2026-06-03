import type { City } from '../../types/game'
import type { BuildMode } from '../../stores/useGameUIStore'

// Estado que o renderer precisa para desenhar uma cena de cidade.
export type RenderState = {
  city: City
  selectedBuildingId: string | null
  buildMode: BuildMode
  editMode: boolean // em edição, o edifício selecionado pode ser movido (fantasma segue o mouse)
  lvlAbbr: string // abreviação de "nível" (ex.: "Nv"/"Lv")
}

export type RendererEvents = {
  cellClick: (x: number, y: number) => void
  buildingClick: (id: string) => void
  pendingClick: (buildId: string) => void // clique numa obra NOVA em andamento (build_queue id)
  // hover sobre um edifício (id) ou nenhum (null), com a posição do cursor (viewport) p/ tooltip.
  hover: (buildingId: string | null, x: number, y: number) => void
}

// Contrato do renderer da cidade. Hoje implementado em Canvas 2D; trocável por PixiJS
// (mesma interface) sem tocar na UI/estado.
export interface IRenderer {
  mount(canvas: HTMLCanvasElement): void
  unmount(): void
  resize(width: number, height: number): void
  render(state: RenderState): void
  on<K extends keyof RendererEvents>(event: K, handler: RendererEvents[K]): void
  off<K extends keyof RendererEvents>(event: K, handler: RendererEvents[K]): void
}
