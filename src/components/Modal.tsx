import { useEffect, type CSSProperties, type ReactNode } from 'react'

// Modal genérico: backdrop escurecido + cartão central. Fecha no backdrop, no ✕ ou no Esc.
export function Modal({ title, onClose, children, width = 340 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={{ ...card, width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={header}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button onClick={onClose} style={closeBtn} aria-label="fechar">
            ✕
          </button>
        </div>
        <div style={{ overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  pointerEvents: 'auto',
}

const card: CSSProperties = {
  maxWidth: '92vw',
  maxHeight: '82vh',
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
  background: 'rgba(17,20,28,0.98)',
  border: '1px solid #39415a',
  borderRadius: 12,
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
}

const header: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
}

const closeBtn: CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#9aa3b2',
  cursor: 'pointer',
  fontSize: 16,
}
