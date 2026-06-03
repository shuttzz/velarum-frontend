import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCityActions } from '../../../queries/useGameMutations'
import { useCatalog } from '../../../queries/useCatalog'
import { buildSecondsForLevel, canAfford, costForLevel, formatDuration } from '../catalog'
import { useNow, secondsUntil } from '../../../lib/useNow'

// Painel do edifício selecionado (HUD, lateral direita): upgrade (com custo/tempo) e dica de mover.
export function SelectedPanel({ city }: { city: City }) {
  const { t } = useTranslation()
  const selectedId = useGameUIStore((s) => s.selectedBuildingId)
  const selectBuilding = useGameUIStore((s) => s.selectBuilding)
  const editMode = useGameUIStore((s) => s.editMode)
  const { upgrade, cancel } = useCityActions(city.id)
  const { data: catalog } = useCatalog()
  const now = useNow()

  const b = city.buildings.find((x) => x.id === selectedId)
  if (!b) return null

  // Upgrade em andamento DESTE edifício (casa por posição + tipo).
  const pendingUpgrade = city.pending.find(
    (p) => p.is_upgrade && p.building_type === b.type && p.x === b.x && p.y === b.y,
  )

  const def = catalog?.buildings.find((d) => d.key === b.type)
  const nextLevel = b.level + 1
  const upCost = def && catalog ? costForLevel(def.base_cost, catalog.growth.cost, nextLevel) : null
  const upTime = def && catalog ? buildSecondsForLevel(def.base_time, catalog.growth.build_time, nextLevel) : null
  const affordable = upCost ? canAfford(city.resources, upCost) : true

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>{t(`buildings.${b.type}`)}</div>
      <div style={{ color: '#9aa3b2', fontSize: 13 }}>
        {t('selected.levelPos', { level: b.level, x: b.x, y: b.y })}
      </div>

      {pendingUpgrade ? (
        // Upgrade em andamento: mostra contador + cancelar (devolve recursos).
        <div style={{ fontSize: 12, marginTop: 8 }}>
          <div style={{ color: '#e0b04a' }}>
            {t('selected.upgrading', { level: pendingUpgrade.target_level, time: formatDuration(secondsUntil(pendingUpgrade.finish_at, now)) })}
          </div>
        </div>
      ) : (
        upCost &&
        upTime != null && (
          <div style={{ fontSize: 12, marginTop: 8 }}>
            <div style={{ color: '#9aa3b2' }}>{t('selected.upgradeTo', { level: nextLevel })}</div>
            <div style={{ color: affordable ? '#cfd6e4' : '#e0884a' }}>
              {[
                upCost.matter && `${upCost.matter} ${t('resourceShort.matter')}`,
                upCost.energy && `${upCost.energy} ${t('resourceShort.energy')}`,
                upCost.knowledge && `${upCost.knowledge} ${t('resourceShort.knowledge')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div style={{ color: '#9aa3b2' }}>⏱ {formatDuration(upTime)}</div>
          </div>
        )
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {pendingUpgrade ? (
          <button onClick={() => cancel.mutate(pendingUpgrade.id)} disabled={cancel.isPending} style={cancelBtn}>
            {cancel.isPending ? t('selected.cancelling') : t('selected.cancel')}
          </button>
        ) : (
          <button onClick={() => upgrade.mutate(b.id)} disabled={upgrade.isPending} style={btn}>
            {t('selected.upgrade')}
          </button>
        )}
        <button onClick={() => selectBuilding(null)} style={btn}>
          {t('common.clear')}
        </button>
      </div>
      {editMode && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 0 }}>{t('selected.moveHint')}</p>}
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

const cancelBtn: CSSProperties = {
  ...btn,
  borderColor: '#7a4a4a',
  background: '#3a2626',
}
