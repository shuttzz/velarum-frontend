import { type CSSProperties } from 'react'
import type { City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCityActions } from '../../../queries/useGameMutations'
import { useCatalog } from '../../../queries/useCatalog'
import { buildSecondsForLevel, buildingName, canAfford, costForLevel, formatDuration } from '../catalog'

// Painel do edifício selecionado (HUD, lateral direita): upgrade (com custo/tempo) e dica de mover.
export function SelectedPanel({ city }: { city: City }) {
  const selectedId = useGameUIStore((s) => s.selectedBuildingId)
  const selectBuilding = useGameUIStore((s) => s.selectBuilding)
  const { upgrade } = useCityActions(city.id)
  const { data: catalog } = useCatalog()

  const b = city.buildings.find((x) => x.id === selectedId)
  if (!b) return null

  const def = catalog?.buildings.find((d) => d.key === b.type)
  const name = catalog ? buildingName(catalog, b.type) : b.type

  const nextLevel = b.level + 1
  const upCost = def && catalog ? costForLevel(def.base_cost, catalog.growth.cost, nextLevel) : null
  const upTime = def && catalog ? buildSecondsForLevel(def.base_time, catalog.growth.build_time, nextLevel) : null
  const affordable = upCost ? canAfford(city.resources, upCost) : true

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div style={{ color: '#9aa3b2', fontSize: 13 }}>
        nível {b.level} · posição ({b.x},{b.y})
      </div>

      {upCost && upTime != null && (
        <div style={{ fontSize: 12, marginTop: 8 }}>
          <div style={{ color: '#9aa3b2' }}>Upgrade → nível {nextLevel}</div>
          <div style={{ color: affordable ? '#cfd6e4' : '#e0884a' }}>
            {[
              upCost.matter && `${upCost.matter} mat`,
              upCost.energy && `${upCost.energy} ene`,
              upCost.knowledge && `${upCost.knowledge} con`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div style={{ color: '#9aa3b2' }}>⏱ {formatDuration(upTime)}</div>
        </div>
      )}

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
