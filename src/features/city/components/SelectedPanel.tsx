import { type CSSProperties } from 'react'
import type { City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCityActions } from '../../../queries/useGameMutations'

const NAMES: Record<string, string> = {
  lar_do_cla: 'Lar do Clã',
  viveiro_de_pedra: 'Viveiro de Pedra',
  fogueira_comunal: 'Fogueira Comunal',
  pedra_da_memoria: 'Pedra da Memória',
  celeiro_de_argila: 'Celeiro de Argila',
  canteiro_de_almas: 'Canteiro de Almas',
}

// Painel do edifício selecionado (HUD, lateral direita): upgrade e dica de mover.
export function SelectedPanel({ city }: { city: City }) {
  const selectedId = useGameUIStore((s) => s.selectedBuildingId)
  const selectBuilding = useGameUIStore((s) => s.selectBuilding)
  const { upgrade } = useCityActions(city.id)

  const b = city.buildings.find((x) => x.id === selectedId)
  if (!b) return null

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>{NAMES[b.type] ?? b.type}</div>
      <div style={{ color: '#9aa3b2', fontSize: 13 }}>
        nível {b.level} · posição ({b.x},{b.y})
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={() => upgrade.mutate(b.id)} disabled={upgrade.isPending} style={btn}>
          ⬆ upgrade
        </button>
        <button onClick={() => selectBuilding(null)} style={btn}>
          limpar
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 0 }}>Para mover: clique numa célula vazia.</p>
    </div>
  )
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 80,
  right: 16,
  width: 220,
  padding: 12,
  background: 'rgba(17,20,28,0.9)',
  color: '#fff',
  borderRadius: 8,
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const btn: CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
