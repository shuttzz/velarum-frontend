import { useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameUIStore } from '../../../stores/useGameUIStore'

// Aviso enquanto se posiciona um edifício novo (após escolher no modal de construção):
// instrui a clicar numa célula e oferece CANCELAR (botão ou tecla Esc).
export function PlacingBanner() {
  const { t } = useTranslation()
  const buildMode = useGameUIStore((s) => s.buildMode)
  const cancel = useGameUIStore((s) => s.cancel)
  const placing = buildMode.type === 'placing'

  useEffect(() => {
    if (!placing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing, cancel])

  if (buildMode.type !== 'placing') return null

  return (
    <div style={banner}>
      <span>{t('build.placing', { name: t(`buildings.${buildMode.buildingType}`) })}</span>
      <button onClick={cancel} style={btn}>
        {t('common.cancel')}
      </button>
    </div>
  )
}

const banner: CSSProperties = {
  position: 'absolute',
  top: 64,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 12px',
  background: 'rgba(17,20,28,0.95)',
  border: '1px solid #6c8ebf',
  borderRadius: 8,
  color: '#cdd4e0',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
  pointerEvents: 'auto',
}

const btn: CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #7a4a4a',
  background: '#3a2626',
  color: '#fff',
  cursor: 'pointer',
}
