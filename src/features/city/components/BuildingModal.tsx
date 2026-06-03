import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, Building, City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCityActions, useArmyActions } from '../../../queries/useGameMutations'
import { useCatalog } from '../../../queries/useCatalog'
import {
  buildSecondsForLevel,
  canAfford,
  costForLevel,
  formatDuration,
  maxAffordable,
} from '../catalog'
import { useNow, secondsUntil } from '../../../lib/useNow'

const BARRACKS_KEY = 'canteiro_de_almas'

// Modal do edifício selecionado (abre ao clicar num edifício, fora do modo edição). Mostra
// upgrade (com custo/tempo/feedback) ou cancelamento; e recrutamento, se for o Canteiro.
export function BuildingModal({ city }: { city: City }) {
  const { t } = useTranslation()
  const selectedId = useGameUIStore((s) => s.selectedBuildingId)
  const editMode = useGameUIStore((s) => s.editMode)
  const selectBuilding = useGameUIStore((s) => s.selectBuilding)

  const b = city.buildings.find((x) => x.id === selectedId)
  if (!b || editMode) return null // no modo edição não abre modal (clique = mover)

  return (
    <Modal title={`${t(`buildings.${b.type}`)} · ${t('selected.lvl', { level: b.level })}`} onClose={() => selectBuilding(null)} width={360}>
      <UpgradeSection city={city} b={b} />
      {b.type === BARRACKS_KEY && <RecruitSection city={city} barracksLevel={b.level} />}
    </Modal>
  )
}

function UpgradeSection({ city, b }: { city: City; b: Building }) {
  const { t } = useTranslation()
  const { upgrade, cancel } = useCityActions(city.id)
  const { data: catalog } = useCatalog()
  const now = useNow()

  const def = catalog?.buildings.find((d) => d.key === b.type)
  const pendingUpgrade = city.pending.find((p) => p.is_upgrade && p.building_type === b.type && p.x === b.x && p.y === b.y)

  const nextLevel = b.level + 1
  const cost = def && catalog ? costForLevel(def.base_cost, catalog.growth.cost, nextLevel) : null
  const time = def && catalog ? buildSecondsForLevel(def.base_time, catalog.growth.build_time, nextLevel) : null
  const affordable = cost ? canAfford(city.resources, cost) : false

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#9aa3b2', fontSize: 13, marginBottom: 8 }}>{t('selected.pos', { x: b.x, y: b.y })}</div>

      {pendingUpgrade ? (
        <div style={panel}>
          <div style={{ color: '#e0b04a' }}>
            {t('selected.upgrading', { level: pendingUpgrade.target_level, time: formatDuration(secondsUntil(pendingUpgrade.finish_at, now)) })}
          </div>
          <button onClick={() => cancel.mutate(pendingUpgrade.id)} disabled={cancel.isPending} style={{ ...btn, ...cancelBtn, marginTop: 8 }}>
            {cancel.isPending ? t('selected.cancelling') : t('selected.cancel')}
          </button>
        </div>
      ) : (
        cost &&
        time != null && (
          <div style={panel}>
            <div style={{ color: '#9aa3b2', fontSize: 13 }}>{t('selected.upgradeTo', { level: nextLevel })}</div>
            <div style={{ color: affordable ? '#5ad17a' : '#e0884a', fontSize: 13, marginTop: 2 }}>
              <CostLine amounts={cost} /> · ⏱ {formatDuration(time)} {affordable ? '· ✓' : `· ✗ ${t('build.cantAfford')}`}
            </div>
            <button onClick={() => upgrade.mutate(b.id)} disabled={upgrade.isPending || !affordable} style={{ ...btn, marginTop: 8 }}>
              {t('selected.upgrade')}
            </button>
          </div>
        )
      )}
    </div>
  )
}

function RecruitSection({ city, barracksLevel }: { city: City; barracksLevel: number }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const { recruit } = useArmyActions(city.id)

  if (!catalog) return null
  const used = city.troops.reduce((s, x) => s + x.count, 0) + city.recruits.reduce((s, x) => s + x.count, 0)
  const capRemaining = Math.max(0, city.army_cap - used)

  return (
    <div style={{ borderTop: '1px solid #2a3142', paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong>{t('military.title')}</strong>
        <span style={{ fontSize: 12, color: '#9aa3b2' }}>{t('military.armyCap', { used, cap: city.army_cap })}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {catalog.units.map((u) => {
          const locked = barracksLevel < u.min_barracks_level
          // Máximo recrutável agora = limitado pelos recursos E pelo teto de exército.
          const max = locked ? 0 : Math.min(maxAffordable(city.resources, u.cost), capRemaining)
          return (
            <UnitRow
              key={u.key}
              name={t(`units.${u.key}`)}
              cost={u.cost}
              time={formatDuration(u.recruit_time)}
              max={max}
              lockedNote={locked ? t('military.locked', { level: u.min_barracks_level }) : null}
              pending={recruit.isPending}
              onRecruit={(count) => recruit.mutate({ unit_type: u.key, count })}
            />
          )
        })}
      </div>
    </div>
  )
}

function UnitRow({
  name,
  cost,
  time,
  max,
  lockedNote,
  pending,
  onRecruit,
}: {
  name: string
  cost: Amounts
  time: string
  max: number
  lockedNote: string | null
  pending: boolean
  onRecruit: (count: number) => void
}) {
  const { t } = useTranslation()
  const [count, setCount] = useState(1)
  const clamped = Math.max(1, Math.min(count, Math.max(max, 1)))
  const canRecruit = !lockedNote && max > 0 && !pending

  return (
    <div style={{ ...panel, opacity: lockedNote ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 11, color: '#9aa3b2' }}>⏱ {t('military.perUnit', { time })}</span>
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b2', marginTop: 2 }}>
        <CostLine amounts={cost} />
      </div>
      {lockedNote ? (
        <div style={{ fontSize: 12, color: '#c2724a', marginTop: 4 }}>{lockedNote}</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: max > 0 ? '#5ad17a' : '#e0884a', marginTop: 4 }}>
            {t('military.maxNow', { max })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <input
              type="number"
              min={1}
              max={Math.max(max, 1)}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              disabled={!canRecruit}
              style={input}
            />
            <button onClick={() => setCount(Math.max(max, 1))} disabled={!canRecruit} style={smallBtn}>
              {t('military.max')}
            </button>
            <button
              onClick={() => {
                onRecruit(clamped)
                setCount(1) // reseta o input após enviar
              }}
              disabled={!canRecruit}
              style={{ ...btn, flex: 1 }}
            >
              {t('military.recruit')}
            </button>
          </div>
        </>
      )}
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

const panel: CSSProperties = {
  padding: '8px 10px',
  background: '#1a1f2b',
  border: '1px solid #2a3142',
  borderRadius: 8,
}

const btn: CSSProperties = {
  padding: '8px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
  cursor: 'pointer',
}

const cancelBtn: CSSProperties = {
  borderColor: '#7a4a4a',
  background: '#3a2626',
  width: '100%',
}

const smallBtn: CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}

const input: CSSProperties = {
  width: 56,
  padding: '6px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#11141c',
  color: '#fff',
}
