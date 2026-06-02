import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, CatalogBuilding, City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCatalog } from '../../../queries/useCatalog'
import { canAfford, copiesUsed, formatDuration, prereqsMet } from '../catalog'

// Paleta de construção (HUD, lateral esquerda). Lista TODOS os edifícios da era a partir
// do catálogo do servidor; mostra custo/tempo e trava os que ainda não cumprem pré-requisito.
// Os textos (nomes, rótulos) são traduzidos pelo i18n a partir da `key` do edifício.
export function BuildPalette({ city }: { city: City }) {
  const { t } = useTranslation()
  const buildMode = useGameUIStore((s) => s.buildMode)
  const startPlacing = useGameUIStore((s) => s.startPlacing)
  const cancel = useGameUIStore((s) => s.cancel)
  const { data: catalog } = useCatalog()

  if (!catalog) return null

  return (
    <div style={panel}>
      <h3 style={{ margin: '0 0 8px' }}>{t('build.title')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {catalog.buildings.map((b) => (
          <BuildOption
            key={b.key}
            b={b}
            city={city}
            active={buildMode.type === 'placing' && buildMode.buildingType === b.key}
            onPick={() => startPlacing(b.key)}
          />
        ))}
      </div>
      {buildMode.type === 'placing' && (
        <p style={{ fontSize: 12, color: '#9aa3b2', marginTop: 8 }}>
          {t('build.placingHint')}{' '}
          <button onClick={cancel} style={cancelBtn}>
            {t('common.cancel')}
          </button>
        </p>
      )}
    </div>
  )
}

function BuildOption({
  b,
  city,
  active,
  onPick,
}: {
  b: CatalogBuilding
  city: City
  active: boolean
  onPick: () => void
}) {
  const { t } = useTranslation()
  const unlocked = prereqsMet(city, b)
  const maxed = copiesUsed(city, b.key) >= b.max_copies
  const affordable = canAfford(city.resources, b.base_cost)
  const disabled = !unlocked || maxed

  const note = !unlocked
    ? t('build.locked', {
        reqs: b.requires
          .map((r) => t('build.req', { name: t(`buildings.${r.building_key}`), level: r.level }))
          .join(', '),
      })
    : maxed
      ? t('build.maxReached', { max: b.max_copies })
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
        <span>{t(`buildings.${b.key}`)}</span>
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
  const { t } = useTranslation()
  const parts: string[] = []
  if (amounts.matter) parts.push(`${amounts.matter} ${t('resourceShort.matter')}`)
  if (amounts.energy) parts.push(`${amounts.energy} ${t('resourceShort.energy')}`)
  if (amounts.knowledge) parts.push(`${amounts.knowledge} ${t('resourceShort.knowledge')}`)
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
