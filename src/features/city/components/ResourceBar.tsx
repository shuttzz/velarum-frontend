import type { City } from '../../../types/game'
import { useResourceTicker } from '../hooks/useResourceTicker'
import { formatAmount } from '../../../lib/format'

// Barra de recursos no topo (HUD). Contadores sobem em tempo real (extrapolação client-side).
export function ResourceBar({ city }: { city: City }) {
  const res = useResourceTicker(city) ?? city.resources
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        gap: 28,
        padding: '10px 16px',
        background: 'rgba(17,20,28,0.85)',
        color: '#fff',
        pointerEvents: 'auto',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <strong style={{ alignSelf: 'center' }}>
        {city.name} · Era {city.era}
      </strong>
      <Item label="Matéria" v={res.matter} cap={city.capacity.matter} rate={city.rate.matter} />
      <Item label="Energia" v={res.energy} cap={city.capacity.energy} rate={city.rate.energy} />
      <Item label="Conhecimento" v={res.knowledge} cap={city.capacity.knowledge} rate={city.rate.knowledge} />
    </div>
  )
}

function Item({ label, v, cap, rate }: { label: string; v: number; cap: number; rate: number }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>{label}</div>
      <div style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
        {formatAmount(v)} <span style={{ fontSize: 11, color: '#6b7280' }}>/ {formatAmount(cap)}</span>
      </div>
      <div style={{ fontSize: 11, color: rate > 0 ? '#5ad17a' : '#6b7280' }}>+{rate}/h</div>
    </div>
  )
}
