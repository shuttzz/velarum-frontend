import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, CatalogBuilding, City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useCatalog } from '../../../queries/useCatalog'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { buildQueueUsed, canAfford, copiesUsed, formatDuration, prereqsMet, queuesForEra } from '../catalog'
import { buildingColor, buildingIcon } from '../buildingVisual'
import { BuildingInfo } from './BuildingInfo'

// Modal de construção (botão "Construir"): MASTER-DETAIL. Lista os construíveis à esquerda;
// selecionar mostra o detalhe à direita (historinha + o que faz + custo/tempo) com o botão
// Construir. Só lista os edifícios IMPLEMENTADOS (o backend já filtra o catálogo) e esconde os
// que estão no máximo de cópias.
export function ConstructionModal({ city, onClose }: { city: City; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const startPlacing = useGameUIStore((s) => s.startPlacing)

  const options = useMemo(
    () => (catalog ? catalog.buildings.filter((b) => copiesUsed(city, b.key) < b.max_copies) : []),
    [catalog, city],
  )
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = options.find((b) => b.key === selectedKey) ?? options[0] ?? null

  const queueLimit = queuesForEra(city.era)
  const queueUsed = buildQueueUsed(city)
  const queueFull = queueUsed >= queueLimit

  if (!catalog) return null

  return (
    <Modal title={t('build.title')} onClose={onClose} width={620}>
      <div style={{ fontSize: 12, marginBottom: 8, color: queueFull ? '#e0b04a' : '#9aa3b2' }}>
        {t('build.queue', { used: queueUsed, max: queueLimit })}
        {queueFull && ` · ${t('build.queueFull')}`}
      </div>
      <div style={layout}>
        <div style={listCol}>
          {options.map((b) => {
            const active = selected?.key === b.key
            const ok = prereqsMet(city, b) && canAfford(city.resources, b.base_cost)
            return (
              <button
                key={b.key}
                onClick={() => setSelectedKey(b.key)}
                style={{ ...listItem, ...(active ? listItemActive : null) }}
              >
                <span style={{ ...listDot, background: buildingColor(b.key) }}>{buildingIcon(b.key)}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{t(`buildings.${b.key}`)}</span>
                <span style={{ fontSize: 12 }}>{ok ? '✓' : '✗'}</span>
              </button>
            )
          })}
        </div>
        <div style={detailCol}>
          {selected ? (
            <Detail
              b={selected}
              city={city}
              queueFull={queueFull}
              onBuild={() => {
                startPlacing(selected.key)
                onClose()
              }}
            />
          ) : (
            <p style={{ color: '#9aa3b2', fontSize: 13 }}>{t('build.selectHint')}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Detail({ b, city, queueFull, onBuild }: { b: CatalogBuilding; city: City; queueFull: boolean; onBuild: () => void }) {
  const { t } = useTranslation()
  const unlocked = prereqsMet(city, b)
  const affordable = canAfford(city.resources, b.base_cost)
  const disabled = !unlocked || !affordable || queueFull

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...thumb, background: buildingColor(b.key) }}>{buildingIcon(b.key)}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t(`buildings.${b.key}`)}</div>
          <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 2 }}>
            {b.w}×{b.h} · ⏱ {formatDuration(b.base_time)}
          </div>
        </div>
      </div>

      <BuildingInfo buildingKey={b.key} def={b} />

      <div style={{ fontSize: 13, marginTop: 8, color: !unlocked ? '#9aa3b2' : affordable ? '#5ad17a' : '#e0884a' }}>
        <CostLine amounts={b.base_cost} /> {affordable ? '· ✓' : `· ✗ ${t('build.cantAfford')}`}
      </div>
      {!unlocked && (
        <div style={{ fontSize: 12, color: '#c2724a', marginTop: 4 }}>
          {t('build.locked', {
            reqs: b.requires.map((r) => t('build.req', { name: t(`buildings.${r.building_key}`), level: r.level })).join(', '),
          })}
        </div>
      )}

      <button onClick={onBuild} disabled={disabled} style={{ ...buildBtn, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
        {queueFull ? `🔒 ${t('build.queueFull')}` : t('build.build')}
      </button>
    </div>
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

const layout: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'stretch',
}

const listCol: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: 200,
  maxHeight: '60vh',
  overflowY: 'auto',
}

const listItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 8px',
  borderRadius: 8,
  border: '1px solid #2a3142',
  background: '#1a1f2b',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
}

const listItemActive: CSSProperties = {
  border: '1px solid #6c8ebf',
  background: '#26344e',
}

const listDot: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  flexShrink: 0,
}

const detailCol: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '4px 4px 4px 12px',
  borderLeft: '1px solid #2a3142',
}

const thumb: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  flexShrink: 0,
}

const buildBtn: CSSProperties = {
  marginTop: 12,
  width: '100%',
  padding: '9px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
}
