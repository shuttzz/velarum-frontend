import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, CatalogBuilding, City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useCatalog } from '../../../queries/useCatalog'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { canAfford, copiesUsed, formatDuration, prereqsMet } from '../catalog'

// Modal de construção (abre pelo botão "Construir"). Lista os edifícios CONSTRUÍVEIS:
// esconde os que já atingiram o máximo de cópias (ex.: Lar do Clã); mantém os bloqueados só
// por pré-requisito (acinzentados). Selecionar entra em modo de posicionamento e fecha.
export function ConstructionModal({ city, onClose }: { city: City; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const startPlacing = useGameUIStore((s) => s.startPlacing)

  if (!catalog) return null
  const options = catalog.buildings.filter((b) => copiesUsed(city, b.key) < b.max_copies)

  return (
    <Modal title={t('build.title')} onClose={onClose} width={380}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((b) => (
          <Option
            key={b.key}
            b={b}
            city={city}
            onPick={() => {
              startPlacing(b.key)
              onClose()
            }}
          />
        ))}
      </div>
    </Modal>
  )
}

function Option({ b, city, onPick }: { b: CatalogBuilding; city: City; onPick: () => void }) {
  const { t } = useTranslation()
  const unlocked = prereqsMet(city, b)
  const affordable = canAfford(city.resources, b.base_cost)
  const disabled = !unlocked || !affordable

  const note = !unlocked
    ? t('build.locked', {
        reqs: b.requires.map((r) => t('build.req', { name: t(`buildings.${r.building_key}`), level: r.level })).join(', '),
      })
    : null

  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ ...item, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{t(`buildings.${b.key}`)}</span>
        <span style={{ fontSize: 12, color: '#9aa3b2' }}>⏱ {formatDuration(b.base_time)}</span>
      </div>
      <div style={{ fontSize: 12, marginTop: 2, color: !unlocked ? '#9aa3b2' : affordable ? '#5ad17a' : '#e0884a' }}>
        <CostLine amounts={b.base_cost} /> {unlocked && (affordable ? '· ✓' : `· ✗ ${t('build.cantAfford')}`)}
      </div>
      {note && <div style={{ fontSize: 12, color: '#c2724a', marginTop: 2 }}>{note}</div>}
    </button>
  )
}

function CostLine({ amounts }: { amounts: Amounts }) {
  const { t } = useTranslation()
  const parts: string[] = []
  if (amounts.matter) parts.push(`${amounts.matter} ${t('resourceShort.matter')}`)
  if (amounts.energy) parts.push(`${amounts.energy} ${t('resourceShort.energy')}`)
  if (amounts.knowledge) parts.push(`${amounts.knowledge} ${t('resourceShort.knowledge')}`)
  return <>{parts.join(' · ')}</>
}

const item: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #39415a',
  background: '#1a1f2b',
  color: '#fff',
  textAlign: 'left',
  fontSize: 13,
}
