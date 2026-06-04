import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { IRenderer } from './renderer/IRenderer'
import { useCity } from '../queries/useCity'
import { useCityActions } from '../queries/useGameMutations'
import { useGameUIStore } from '../stores/useGameUIStore'
import { useResizeCanvas } from './useResizeCanvas'
import { errorMessage } from '../api/client'

// Canvas fullscreen do jogo. Faz a ponte entre o renderer (eventos de clique/hover) e o estado:
// - clique em edifício -> seleciona; em obra nova -> cancelar; em célula vazia -> constrói/move
// - hover em edifício -> tooltip (HTML) com o nome (o tile mostra só ícone + nível)
export function GameCanvas({ cityId, renderer }: { cityId: string; renderer: IRenderer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { data: city } = useCity(cityId)
  const selectedBuildingId = useGameUIStore((s) => s.selectedBuildingId)
  const buildMode = useGameUIStore((s) => s.buildMode)
  const editMode = useGameUIStore((s) => s.editMode)
  const actions = useCityActions(cityId)
  const { t } = useTranslation()
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  // Mensagem transitória de erro (ex.: fila cheia, posição inválida) ao posicionar/mover na grade.
  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 3500)
    return () => clearTimeout(id)
  }, [flash])

  const lvlAbbr = t('hud.lvlAbbr')
  // Nome traduzido por tipo, para o tooltip.
  const names = useMemo(() => {
    const m: Record<string, string> = {}
    for (const b of city?.buildings ?? []) m[b.type] = t(`buildings.${b.type}`)
    return m
  }, [city, t])

  // ref com o contexto atual para os handlers do renderer não verem estado obsoleto
  const ctxRef = useRef({ actions, setFlash })
  ctxRef.current = { actions, setFlash }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderer.mount(canvas)
    return () => renderer.unmount()
  }, [renderer])

  useResizeCanvas(canvasRef, renderer)

  useEffect(() => {
    if (city) renderer.render({ city, selectedBuildingId, buildMode, editMode, lvlAbbr })
  }, [renderer, city, selectedBuildingId, buildMode, editMode, lvlAbbr])

  // Enquanto há obras OU recrutamento em andamento, redesenha periodicamente p/ os contadores.
  useEffect(() => {
    if (!city || (city.pending.length === 0 && city.recruits.length === 0)) return
    const id = setInterval(() => renderer.render({ city, selectedBuildingId, buildMode, editMode, lvlAbbr }), 500)
    return () => clearInterval(id)
  }, [renderer, city, selectedBuildingId, buildMode, editMode, lvlAbbr])

  useEffect(() => {
    const onBuilding = (id: string) => useGameUIStore.getState().selectBuilding(id)
    const onPending = (id: string) => useGameUIStore.getState().selectPending(id)
    const onHover = (id: string | null, x: number, y: number) => setHover(id ? { id, x, y } : null)
    const onCell = (x: number, y: number) => {
      const ui = useGameUIStore.getState()
      const { actions, setFlash } = ctxRef.current
      if (ui.buildMode.type === 'placing') {
        actions.construct.mutate(
          { building_type: ui.buildMode.buildingType, x, y },
          { onError: (e) => setFlash(errorMessage(e)) },
        )
        ui.cancel()
      } else if (ui.editMode && ui.selectedBuildingId) {
        // Só move no MODO EDIÇÃO; fora dele, clicar em célula vazia apenas limpa a seleção.
        actions.move.mutate(
          { buildingId: ui.selectedBuildingId, x, y },
          { onError: (e) => setFlash(errorMessage(e)) },
        )
        ui.selectBuilding(null)
      } else if (ui.selectedBuildingId) {
        ui.selectBuilding(null)
      } else if (ui.selectedPendingId) {
        ui.selectPending(null)
      }
    }
    renderer.on('buildingClick', onBuilding)
    renderer.on('pendingClick', onPending)
    renderer.on('hover', onHover)
    renderer.on('cellClick', onCell)
    return () => {
      renderer.off('buildingClick', onBuilding)
      renderer.off('pendingClick', onPending)
      renderer.off('hover', onHover)
      renderer.off('cellClick', onCell)
    }
  }, [renderer])

  const interactive = buildMode.type === 'placing' || (editMode && selectedBuildingId !== null)
  const hoverType = hover ? city?.buildings.find((b) => b.id === hover.id)?.type : undefined
  const hoverName = hoverType ? names[hoverType] : undefined
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: interactive ? 'crosshair' : 'default' }}
      />
      {hover && hoverName && (
        <div style={{ ...tooltip, left: hover.x + 12, top: hover.y + 12 }}>{hoverName}</div>
      )}
      {flash && <div style={errorToast}>{flash}</div>}
    </>
  )
}

const errorToast: CSSProperties = {
  position: 'absolute',
  bottom: 64,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '10px 16px',
  background: 'rgba(58,26,26,0.96)',
  border: '1px solid #9f5a5a',
  borderRadius: 8,
  color: '#fff',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
  pointerEvents: 'none',
  zIndex: 60,
  maxWidth: '80vw',
  textAlign: 'center',
}

const tooltip: CSSProperties = {
  position: 'fixed',
  padding: '4px 8px',
  background: 'rgba(17,20,28,0.95)',
  border: '1px solid #39415a',
  borderRadius: 6,
  color: '#fff',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  pointerEvents: 'none',
  zIndex: 40,
  whiteSpace: 'nowrap',
}
