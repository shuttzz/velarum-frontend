import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, CatalogBuilding, City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useCatalog } from '../../../queries/useCatalog'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { canAfford, copiesUsed, formatDuration, prereqsMet } from '../catalog'
import { buildingColor } from '../buildingVisual'

// Modal de construção (botão "Construir"): GRADE de cards. Cada card tem o slot de imagem
// (placeholder colorido por ora → sprite depois) + nome + custo/tempo. Esconde os edifícios
// no máximo de cópias; mantém os bloqueados por pré-requisito (desabilitados, com a dica).
export function ConstructionModal({ city, onClose }: { city: City; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const startPlacing = useGameUIStore((s) => s.startPlacing)

  if (!catalog) return null
  const options = catalog.buildings.filter((b) => copiesUsed(city, b.key) < b.max_copies)

  return (
    <Modal title={t('build.title')} onClose={onClose} width={560}>
      <div style={grid}>
        {options.map((b) => (
          <Card
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

function Card({ b, city, onPick }: { b: CatalogBuilding; city: City; onPick: () => void }) {
  const { t } = useTranslation()
  const unlocked = prereqsMet(city, b)
  const affordable = canAfford(city.resources, b.base_cost)
  const disabled = !unlocked || !affordable

  return (
    <button onClick={onPick} disabled={disabled} style={{ ...card, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {/* Slot de imagem (futuro sprite) */}
      <div style={{ ...thumb, background: buildingColor(b.key) }}>
        {b.w > 1 || b.h > 1 ? (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
            {b.w}×{b.h}
          </span>
        ) : null}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6, lineHeight: 1.2 }}>{t(`buildings.${b.key}`)}</div>
      <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 3 }}>⏱ {formatDuration(b.base_time)}</div>
      <div style={{ fontSize: 11, marginTop: 2, color: !unlocked ? '#9aa3b2' : affordable ? '#5ad17a' : '#e0884a' }}>
        <CostLine amounts={b.base_cost} />
      </div>
      {!unlocked && (
        <div style={{ fontSize: 10, color: '#c2724a', marginTop: 3 }}>
          {t('build.locked', { reqs: b.requires.map((r) => t('build.req', { name: t(`buildings.${r.building_key}`), level: r.level })).join(', ') })}
        </div>
      )}
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

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 10,
}

const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 8,
  borderRadius: 10,
  border: '1px solid #39415a',
  background: '#1a1f2b',
  color: '#fff',
  textAlign: 'left',
  fontFamily: 'system-ui, sans-serif',
}

const thumb: CSSProperties = {
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  padding: 4,
  boxSizing: 'border-box',
}
