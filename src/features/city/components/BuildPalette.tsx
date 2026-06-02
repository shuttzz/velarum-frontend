import { type CSSProperties } from 'react'
import type { Amounts, Catalog, CatalogBuilding, City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCatalog } from '../../../queries/useCatalog'
import { buildingName, canAfford, copiesUsed, formatDuration, prereqsMet } from '../catalog'

// Paleta de construção (HUD, lateral esquerda). Lista TODOS os edifícios da era a partir
// do catálogo do servidor; mostra custo/tempo e trava os que ainda não cumprem pré-requisito.
// Selecionar um disponível entra em modo "placing": o próximo clique numa célula constrói ali.
export function BuildPalette({ city }: { city: City }) {
  const buildMode = useGameUIStore((s) => s.buildMode)
  const startPlacing = useGameUIStore((s) => s.startPlacing)
  const cancel = useGameUIStore((s) => s.cancel)
  const { data: catalog } = useCatalog()

  if (!catalog) return null

  return (
    <div style={panel}>
      <h3 style={{ margin: '0 0 8px' }}>Construir</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {catalog.buildings.map((b) => (
          <BuildOption
            key={b.key}
            b={b}
            city={city}
            catalog={catalog}
            active={buildMode.type === 'placing' && buildMode.buildingType === b.key}
            onPick={() => startPlacing(b.key)}
          />
        ))}
      </div>
      {buildMode.type === 'placing' && (
        <p style={{ fontSize: 12, color: '#9aa3b2', marginTop: 8 }}>
          Clique numa célula vazia…{' '}
          <button onClick={cancel} style={cancelBtn}>
            cancelar
          </button>
        </p>
      )}
    </div>
  )
}

function BuildOption({
  b,
  city,
  catalog,
  active,
  onPick,
}: {
  b: CatalogBuilding
  city: City
  catalog: Catalog
  active: boolean
  onPick: () => void
}) {
  const unlocked = prereqsMet(city, b)
  const maxed = copiesUsed(city, b.key) >= b.max_copies
  const affordable = canAfford(city.resources, b.base_cost)
  const disabled = !unlocked || maxed

  const note = !unlocked
    ? '🔒 requer ' + b.requires.map((r) => `${buildingName(catalog, r.building_key)} nv${r.level}`).join(', ')
    : maxed
      ? `máx. ${b.max_copies}`
      : null

  return (
    <button
      onClick={onPick}
      disabled={disabled}
      aria-pressed={active}
      style={{
        ...item,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#2c3a5a' : '#222838',
        borderColor: active ? '#6c8ebf' : '#39415a',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{b.name}</span>
        <span style={{ fontSize: 11, color: '#9aa3b2' }}>⏱ {formatDuration(b.base_time)}</span>
      </div>
      {!disabled && (
        <div style={{ fontSize: 11, color: affordable ? '#9aa3b2' : '#e0884a', marginTop: 2 }}>
          <CostLine amounts={b.base_cost} />
        </div>
      )}
      {note && <div style={{ fontSize: 11, color: '#c2724a', marginTop: 2 }}>{note}</div>}
    </button>
  )
}

// Linha de custo: só mostra os recursos com valor > 0.
function CostLine({ amounts }: { amounts: Amounts }) {
  const parts: string[] = []
  if (amounts.matter) parts.push(`${amounts.matter} mat`)
  if (amounts.energy) parts.push(`${amounts.energy} ene`)
  if (amounts.knowledge) parts.push(`${amounts.knowledge} con`)
  return <>{parts.join(' · ')}</>
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 80,
  left: 16,
  width: 220,
  padding: 12,
  background: 'rgba(17,20,28,0.9)',
  color: '#fff',
  borderRadius: 8,
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
  maxHeight: 'calc(100vh - 110px)',
  overflowY: 'auto',
}

const item: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
}

const cancelBtn: CSSProperties = {
  padding: '2px 8px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
