import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameUIStore } from '../stores/useGameUIStore'

// Botão de modo Editar layout (HUD, topo-centro). Só no modo edição é possível mover edifícios.
export function EditToggle() {
  const { t } = useTranslation()
  const editMode = useGameUIStore((s) => s.editMode)
  const toggleEdit = useGameUIStore((s) => s.toggleEdit)
  return (
    <button onClick={toggleEdit} aria-pressed={editMode} style={{ ...btn, ...(editMode ? active : null) }}>
      {editMode ? t('build.editDone') : t('build.edit')}
    </button>
  )
}

const btn: CSSProperties = {
  position: 'absolute',
  top: 64,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 14px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #39415a',
  background: 'rgba(34,40,56,0.92)',
  color: '#fff',
  cursor: 'pointer',
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const active: CSSProperties = {
  background: '#2c3a5a',
  borderColor: '#6c8ebf',
}
