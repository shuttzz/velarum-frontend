import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  const editMode = useGameUIStore((s) => s.editMode)
  const actions = useCityActions(cityId)
  const { t } = useTranslation()

  // Nomes traduzidos por tipo (texto do tile consistente com o nome real) + abreviação de nível.
  const names = useMemo(() => {
    const m: Record<string, string> = {}
    for (const b of city?.buildings ?? []) m[b.type] = t(`buildings.${b.type}`)
    for (const p of city?.pending ?? []) m[p.building_type] = t(`buildings.${p.building_type}`)
    return m
  }, [city, t])
  const lvlAbbr = t('hud.lvlAbbr')

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
    if (city) renderer.render({ city, selectedBuildingId, buildMode, editMode, names, lvlAbbr })
  }, [renderer, city, selectedBuildingId, buildMode, editMode, names, lvlAbbr])

  // Enquanto há obras OU recrutamento em andamento, redesenha periodicamente p/ os contadores.
  useEffect(() => {
    if (!city || (city.pending.length === 0 && city.recruits.length === 0)) return
    const id = setInterval(() => renderer.render({ city, selectedBuildingId, buildMode, editMode, names, lvlAbbr }), 500)
    return () => clearInterval(id)
  }, [renderer, city, selectedBuildingId, buildMode, editMode, names, lvlAbbr])

  useEffect(() => {
    const onBuilding = (id: string) => useGameUIStore.getState().selectBuilding(id)
    const onPending = (id: string) => useGameUIStore.getState().selectPending(id)
    const onCell = (x: number, y: number) => {
      const ui = useGameUIStore.getState()
      const { actions } = ctxRef.current
      if (ui.buildMode.type === 'placing') {
        actions.construct.mutate({ building_type: ui.buildMode.buildingType, x, y })
        ui.cancel()
      } else if (ui.editMode && ui.selectedBuildingId) {
        // Só move no MODO EDIÇÃO; fora dele, clicar em célula vazia apenas limpa a seleção.
        actions.move.mutate({ buildingId: ui.selectedBuildingId, x, y })
        ui.selectBuilding(null)
      } else if (ui.selectedBuildingId) {
        ui.selectBuilding(null)
      } else if (ui.selectedPendingId) {
        ui.selectPending(null)
      }
    }
    renderer.on('buildingClick', onBuilding)
    renderer.on('pendingClick', onPending)
    renderer.on('cellClick', onCell)
    return () => {
      renderer.off('buildingClick', onBuilding)
      renderer.off('pendingClick', onPending)
      renderer.off('cellClick', onCell)
    }
  }, [renderer])

  const interactive = buildMode.type === 'placing' || (editMode && selectedBuildingId !== null)
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: interactive ? 'crosshair' : 'default' }}
    />
  )
}
