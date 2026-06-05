import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, BattleReport, CollectReport, Report } from '../../types/game'
import { useReports, useMarkReportsRead } from '../../queries/useReports'

// Caixa de relatórios (sobreposta a qualquer tela): botão com badge de não-lidos, painel com
// a lista e um TOAST quando chega um relatório novo (feedback visual mesmo no mapa do mundo).
export function ReportsOverlay({ cityId }: { cityId: string }) {
  const { t } = useTranslation()
  const { data } = useReports(cityId)
  const markRead = useMarkReportsRead(cityId)
  const [open, setOpen] = useState(false)

  const reports = data ?? []
  const unread = reports.filter((r) => !r.read).length

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (unread > 0) markRead.mutate()
  }

  return (
    <>
      <ReportToaster reports={reports} />
      <button onClick={toggle} style={fab} aria-label={t('reports.title')}>
        📜
        {unread > 0 && <span style={badge}>{unread}</span>}
      </button>
      {open && <ReportsPanel reports={reports} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportsPanel({ reports, onClose }: { reports: Report[]; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>{t('reports.title')}</strong>
        <button onClick={onClose} style={closeBtn}>
          ✕
        </button>
      </div>
      {reports.length === 0 ? (
        <p style={{ color: '#9aa3b2', fontSize: 13 }}>{t('reports.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map((r) => (r.type === 'collection' ? <CollectEntry key={r.id} r={r} /> : <BattleEntry key={r.id} r={r} />))}
        </div>
      )}
    </div>
  )
}

function CollectEntry({ r }: { r: Report }) {
  const { t } = useTranslation()
  const c = r.payload as CollectReport
  if (c.bounced) {
    return (
      <div style={entry}>
        <div style={{ fontWeight: 600, color: '#e0884a' }}>{t('reports.collectBounced')}</div>
      </div>
    )
  }
  return (
    <div style={entry}>
      <div style={{ fontWeight: 600, color: '#7fd99b' }}>{t('reports.collected')}</div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>
        {Math.round(c.collected)} {t(`resourceShort.${c.resource}`)}
      </div>
    </div>
  )
}

function BattleEntry({ r }: { r: Report }) {
  const { t } = useTranslation()
  const b = r.payload as BattleReport
  const losses = Object.entries(b.losses)
    .filter(([, c]) => c > 0)
    .map(([k, c]) => `${c} ${t(`units.${k}`)}`)
    .join(', ')
  const hasReward = !!(b.reward.matter || b.reward.energy || b.reward.knowledge)
  return (
    <div style={entry}>
      <div style={{ fontWeight: 600, color: b.attacker_won ? '#5ad17a' : '#e0884a' }}>
        {b.attacker_won ? t('map.victory') : t('map.defeat')} · {t(`provinces.${b.province_name_key}`)}
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>
        {t('reports.losses')}: {losses || t('reports.none')}
      </div>
      {b.attacker_won && hasReward && (
        <div style={{ fontSize: 12, color: '#9aa3b2' }}>
          {t('reports.reward')}: <Reward a={b.reward} />
        </div>
      )}
    </div>
  )
}

function ReportToaster({ reports }: { reports: Report[] }) {
  const { t } = useTranslation()
  const seen = useRef<string | undefined>(undefined)
  const [toast, setToast] = useState<Report | null>(null)
  const newestId = reports[0]?.id

  useEffect(() => {
    const newest = reports[0]
    if (!newest) return
    // 1ª carga: registra o mais recente sem notificar (evita toast de relatórios antigos).
    if (seen.current === undefined) {
      seen.current = newest.id
      return
    }
    if (newest.id !== seen.current) {
      seen.current = newest.id
      setToast(newest)
    }
  }, [newestId, reports])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  if (!toast) return null
  if (toast.type === 'collection') {
    const c = toast.payload as CollectReport
    return (
      <div style={toastStyle} onClick={() => setToast(null)} role="status">
        {c.bounced ? (
          <strong style={{ color: '#e0884a' }}>{t('reports.collectBounced')}</strong>
        ) : (
          <>
            <strong style={{ color: '#7fd99b' }}>{t('reports.collected')}</strong> · {Math.round(c.collected)}{' '}
            {t(`resourceShort.${c.resource}`)}
          </>
        )}
      </div>
    )
  }
  const b = toast.payload as BattleReport
  return (
    <div style={toastStyle} onClick={() => setToast(null)} role="status">
      <strong style={{ color: b.attacker_won ? '#5ad17a' : '#e0884a' }}>
        {b.attacker_won ? t('map.victory') : t('map.defeat')}
      </strong>{' '}
      · {t(`provinces.${b.province_name_key}`)}
    </div>
  )
}

function Reward({ a }: { a: Amounts }) {
  const { t } = useTranslation()
  const parts: string[] = []
  if (a.matter) parts.push(`${a.matter} ${t('resourceShort.matter')}`)
  if (a.energy) parts.push(`${a.energy} ${t('resourceShort.energy')}`)
  if (a.knowledge) parts.push(`${a.knowledge} ${t('resourceShort.knowledge')}`)
  return <>{parts.join(' · ')}</>
}

const fab: CSSProperties = {
  position: 'fixed',
  bottom: 56,
  right: 16,
  width: 44,
  height: 44,
  borderRadius: 22,
  border: '1px solid #39415a',
  background: 'rgba(34,40,56,0.95)',
  color: '#fff',
  fontSize: 20,
  cursor: 'pointer',
  pointerEvents: 'auto',
  zIndex: 50,
}

const badge: CSSProperties = {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  padding: '0 4px',
  borderRadius: 9,
  background: '#c2724a',
  color: '#fff',
  fontSize: 11,
  lineHeight: '18px',
  textAlign: 'center',
  fontFamily: 'system-ui, sans-serif',
}

const panel: CSSProperties = {
  position: 'fixed',
  bottom: 108,
  right: 16,
  width: 300,
  maxHeight: '56vh',
  overflowY: 'auto',
  padding: 12,
  background: 'rgba(17,20,28,0.96)',
  border: '1px solid #39415a',
  borderRadius: 10,
  color: '#fff',
  pointerEvents: 'auto',
  zIndex: 50,
  fontFamily: 'system-ui, sans-serif',
}

const entry: CSSProperties = {
  padding: '8px 10px',
  background: '#1a1f2b',
  border: '1px solid #2a3142',
  borderRadius: 8,
}

const closeBtn: CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#9aa3b2',
  cursor: 'pointer',
  fontSize: 14,
}

const toastStyle: CSSProperties = {
  position: 'fixed',
  top: 70,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '10px 16px',
  background: 'rgba(17,20,28,0.96)',
  border: '1px solid #39415a',
  borderRadius: 8,
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  cursor: 'pointer',
  pointerEvents: 'auto',
  zIndex: 60,
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
}
