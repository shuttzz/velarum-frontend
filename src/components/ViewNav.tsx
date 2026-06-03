import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameUIStore } from '../stores/useGameUIStore'

// Alterna entre a tela da cidade e o mapa do mundo (HUD, centro inferior).
export function ViewNav() {
  const { t } = useTranslation()
  const view = useGameUIStore((s) => s.view)
  const setView = useGameUIStore((s) => s.setView)
  return (
    <button onClick={() => setView(view === 'city' ? 'map' : 'city')} style={btn}>
      {view === 'city' ? t('nav.toMap') : t('nav.toCity')}
    </button>
  )
}

const btn: CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '8px 18px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
  cursor: 'pointer',
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}
