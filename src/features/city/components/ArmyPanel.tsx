import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, City } from '../../../types/game'
import { useCatalog } from '../../../queries/useCatalog'
import { useArmyActions } from '../../../queries/useGameMutations'
import { canAfford, formatDuration } from '../catalog'
import { useNow, secondsUntil } from '../../../lib/useNow'

// Painel de exército (HUD, lateral inferior esquerda): guarnição, recrutamento e capacidade.
export function ArmyPanel({ city }: { city: City }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const { recruit } = useArmyActions(city.id)
  const now = useNow()

  if (!catalog) return null

  const used =
    city.troops.reduce((s, x) => s + x.count, 0) + city.recruits.reduce((s, x) => s + x.count, 0)
  const marching = city.marches
    .filter((m) => m.status !== 'done')
    .reduce((s, m) => s + Object.values(m.troops).reduce((a, b) => a + b, 0), 0)
  const noBarracks = city.army_cap === 0
  // Nível do Canteiro de Almas (para desbloqueio de unidades).
  const barracksLevel = city.buildings
    .filter((b) => b.type === 'canteiro_de_almas')
    .reduce((m, b) => Math.max(m, b.level), 0)

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{t('military.title')}</h3>
        <span style={{ fontSize: 11, color: '#9aa3b2' }}>{t('military.armyCap', { used, cap: city.army_cap })}</span>
      </div>

      {noBarracks ? (
        <p style={{ fontSize: 12, color: '#c2724a', margin: '8px 0 0' }}>{t('errors.no_barracks')}</p>
      ) : (
        <>
          {/* Recrutamento por tipo de unidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {catalog.units.map((u) => {
              const locked = barracksLevel < u.min_barracks_level
              return (
                <UnitRow
                  key={u.key}
                  name={t(`units.${u.key}`)}
                  cost={u.cost}
                  time={formatDuration(u.recruit_time)}
                  affordable={canAfford(city.resources, u.cost)}
                  disabled={recruit.isPending || used >= city.army_cap || locked}
                  lockedNote={locked ? t('military.locked', { level: u.min_barracks_level }) : null}
                  onRecruit={(count) => recruit.mutate({ unit_type: u.key, count })}
                />
              )
            })}
          </div>

          {/* Guarnição atual */}
          <div style={{ fontSize: 12, color: '#9aa3b2', marginTop: 8 }}>
            {t('military.garrison')}:{' '}
            {city.troops.length === 0
              ? t('military.empty')
              : city.troops.map((tr) => `${tr.count} ${t(`units.${tr.unit_type}`)}`).join(' · ')}
          </div>

          {/* Recrutamentos em andamento */}
          {city.recruits.map((r) => (
            <div key={r.id} style={{ fontSize: 11, color: '#5ad17a', marginTop: 2 }}>
              {t('military.recruiting')} {r.count} {t(`units.${r.unit_type}`)} · {formatDuration(secondsUntil(r.finish_at, now))}
            </div>
          ))}
          {marching > 0 && (
            <div style={{ fontSize: 11, color: '#e0b04a', marginTop: 2 }}>{t('military.marching', { count: marching })}</div>
          )}
        </>
      )}
    </div>
  )
}

function UnitRow({
  name,
  cost,
  time,
  affordable,
  disabled,
  lockedNote,
  onRecruit,
}: {
  name: string
  cost: Amounts
  time: string
  affordable: boolean
  disabled: boolean
  lockedNote: string | null
  onRecruit: (count: number) => void
}) {
  const { t } = useTranslation()
  const [count, setCount] = useState(1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: lockedNote ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 10, color: lockedNote ? '#c2724a' : affordable ? '#9aa3b2' : '#e0884a' }}>
          {lockedNote ?? (
            <>
              <CostLine amounts={cost} /> · ⏱ {t('military.perUnit', { time })}
            </>
          )}
        </div>
      </div>
      <input
        type="number"
        min={1}
        value={count}
        onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
        disabled={!!lockedNote}
        style={input}
      />
      <button onClick={() => onRecruit(count)} disabled={disabled} style={btn}>
        {t('military.recruit')}
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

const panel: CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: 16,
  width: 260,
  padding: 12,
  background: 'rgba(17,20,28,0.9)',
  color: '#fff',
  borderRadius: 8,
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const input: CSSProperties = {
  width: 46,
  padding: '4px 6px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#11141c',
  color: '#fff',
}

const btn: CSSProperties = {
  padding: '6px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
}
