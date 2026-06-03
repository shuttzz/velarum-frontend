import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useProvinces } from '../../../queries/useProvinces'
import { useNow, secondsUntil } from '../../../lib/useNow'
import { formatDuration } from '../catalog'
import { unitColor } from '../buildingVisual'

// Modal de visão geral do Exército: guarnição (tropas na cidade), em treinamento e em marcha.
export function ArmyModal({ city, onClose }: { city: City; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: provinces } = useProvinces(city.id)
  const now = useNow()

  const used = city.troops.reduce((s, x) => s + x.count, 0) + city.recruits.reduce((s, x) => s + x.count, 0)
  const marches = city.marches.filter((m) => m.status !== 'done')
  const provName = (id: string) => {
    const p = provinces?.find((x) => x.id === id)
    return p ? t(`provinces.${p.name_key}`) : '—'
  }

  return (
    <Modal title={t('army.title')} onClose={onClose} width={420}>
      {/* Guarnição */}
      <div style={section}>
        <div style={sectionHead}>
          <strong>{t('military.garrison')}</strong>
          <span style={{ fontSize: 12, color: '#9aa3b2' }}>{t('military.armyCap', { used, cap: city.army_cap })}</span>
        </div>
        {city.troops.length === 0 ? (
          <p style={empty}>{t('military.empty')}</p>
        ) : (
          <div style={chips}>
            {city.troops.map((tr) => (
              <span key={tr.unit_type} style={chip}>
                <span style={{ ...dot, background: unitColor(tr.unit_type) }} />
                {tr.count}× {t(`units.${tr.unit_type}`)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Em treinamento */}
      {city.recruits.length > 0 && (
        <div style={section}>
          <div style={sectionHead}>
            <strong>{t('military.training')}</strong>
          </div>
          {city.recruits.map((r) => (
            <div key={r.id} style={row}>
              <span>
                {r.count}× {t(`units.${r.unit_type}`)}
              </span>
              <span style={{ color: '#e0b04a' }}>⏳ {formatDuration(secondsUntil(r.finish_at, now))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Em marcha */}
      <div style={section}>
        <div style={sectionHead}>
          <strong>{t('army.marching')}</strong>
        </div>
        {marches.length === 0 ? (
          <p style={empty}>{t('army.noMarches')}</p>
        ) : (
          marches.map((m) => {
            const troops = Object.entries(m.troops)
              .map(([k, c]) => `${c}× ${t(`units.${k}`)}`)
              .join(', ')
            const eta = m.status === 'outbound' ? m.arrive_at : (m.return_at ?? m.arrive_at)
            return (
              <div key={m.id} style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>→ {provName(m.province_id)}</span>
                  {m.status === 'returning' && m.attacker_won != null && (
                    <span style={{ color: m.attacker_won ? '#5ad17a' : '#e0884a', fontWeight: 600 }}>
                      {m.attacker_won ? t('map.victory') : t('map.defeat')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9aa3b2' }}>{troops}</div>
                <div style={{ fontSize: 12, color: '#e0b04a' }}>
                  {m.status === 'outbound'
                    ? t('map.outbound', { time: formatDuration(secondsUntil(eta, now)) })
                    : t('map.returning', { time: formatDuration(secondsUntil(eta, now)) })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}

const section: CSSProperties = { marginBottom: 14 }
const sectionHead: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }
const empty: CSSProperties = { fontSize: 13, color: '#6b7280', margin: 0 }
const chips: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  background: '#1a1f2b',
  border: '1px solid #2a3142',
  borderRadius: 8,
  fontSize: 13,
}
const dot: CSSProperties = { width: 12, height: 12, borderRadius: 3, display: 'inline-block' }
const row: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 10px',
  marginBottom: 4,
  background: '#1a1f2b',
  border: '1px solid #2a3142',
  borderRadius: 8,
  fontSize: 13,
}
