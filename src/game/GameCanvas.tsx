import { useEffect, useRef } from 'react'
import type { IRenderer } from './renderer/IRenderer'
import { useCity } from '../queries/useCity'
import { useCityActions } from '../queries/useGameMutations'
import { useGameUIStore } from '../stores/useGameUIStore'
import { useResizeCanvas } from './useResizeCanvas'

// Canvas fullscreen do jogo. Faz a ponte entre o renderer (eventos de clique) e o estado:
// - clique em edifício -> seleciona
// - clique em célula vazia -> constrói (se em modo placing) ou move (se há selecionado)
export function GameCanvas({ cityId, renderer }: { cityId: string; renderer: IRenderer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { data: city } = useCity(cityId)
  const selectedBuildingId = useGameUIStore((s) => s.selectedBuildingId)
  const buildMode = useGameUIStore((s) => s.buildMode)
  const actions = useCityActions(cityId)

  // ref com o contexto atual para os handlers do renderer não verem estado obsoleto
  const ctxRef = useRef({ actions })
  ctxRef.current = { actions }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderer.mount(canvas)
    return () => renderer.unmount()
  }, [renderer])

  useResizeCanvas(canvasRef, renderer)

  useEffect(() => {
    if (city) renderer.render({ city, selectedBuildingId, buildMode })
  }, [renderer, city, selectedBuildingId, buildMode])

  useEffect(() => {
    const onBuilding = (id: string) => useGameUIStore.getState().selectBuilding(id)
    const onCell = (x: number, y: number) => {
      const ui = useGameUIStore.getState()
      const { actions } = ctxRef.current
      if (ui.buildMode.type === 'placing') {
        actions.construct.mutate({ building_type: ui.buildMode.buildingType, x, y })
        ui.cancel()
      } else if (ui.selectedBuildingId) {
        actions.move.mutate({ buildingId: ui.selectedBuildingId, x, y })
        ui.selectBuilding(null)
      }
    }
    renderer.on('buildingClick', onBuilding)
    renderer.on('cellClick', onCell)
    return () => {
      renderer.off('buildingClick', onBuilding)
      renderer.off('cellClick', onCell)
    }
  }, [renderer])

  const interactive = buildMode.type === 'placing' || selectedBuildingId !== null
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: interactive ? 'crosshair' : 'default' }}
    />
  )
}
