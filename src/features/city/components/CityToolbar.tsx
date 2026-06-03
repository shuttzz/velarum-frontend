import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { City } from '../../../types/game'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { ConstructionModal } from './ConstructionModal'

// Barra de ações da cidade (HUD, centro inferior): Construir (abre modal), Editar layout
// (toggle), Mapa. Substitui os painéis fixos por uma barra enxuta + modais.
export function CityToolbar({ city }: { city: City }) {
  const { t } = useTranslation()
  const editMode = useGameUIStore((s) => s.editMode)
  const toggleEdit = useGameUIStore((s) => s.toggleEdit)
  const setView = useGameUIStore((s) => s.setView)
  const [constructOpen, setConstructOpen] = useState(false)

  return (
    <>
      {editMode && <div style={hint}>{t('build.editHint')}</div>}
      <div style={bar}>
        <button onClick={() => setConstructOpen(true)} style={btn}>
          {t('build.openBtn')}
        </button>
        <button onClick={toggleEdit} aria-pressed={editMode} style={{ ...btn, ...(editMode ? active : null) }}>
          {editMode ? t('build.editDone') : t('build.edit')}
        </button>
        <button onClick={() => setView('map')} style={btn}>
          {t('nav.toMap')}
        </button>
      </div>
      {constructOpen && <ConstructionModal city={city} onClose={() => setConstructOpen(false)} />}
    </>
  )
}

const bar: CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 8,
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const hint: CSSProperties = {
  position: 'absolute',
  top: 64,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 12px',
  background: 'rgba(17,20,28,0.9)',
  borderRadius: 8,
  color: '#cdd4e0',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  pointerEvents: 'none',
}

const btn: CSSProperties = {
  padding: '8px 16px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #39415a',
  background: 'rgba(34,40,56,0.95)',
  color: '#fff',
  cursor: 'pointer',
}

const active: CSSProperties = {
  background: '#2c3a5a',
  borderColor: '#6c8ebf',
}
