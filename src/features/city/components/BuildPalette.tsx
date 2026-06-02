import { type CSSProperties } from 'react'
import { useGameUIStore } from '../../../stores/useGameUIStore'

const OPTIONS = [
  { key: 'viveiro_de_pedra', name: 'Viveiro de Pedra' },
  { key: 'celeiro_de_argila', name: 'Celeiro de Argila' },
]

// Paleta de construção (HUD, lateral esquerda). Selecionar entra em modo "placing":
// o próximo clique numa célula vazia do canvas constrói ali.
export function BuildPalette() {
  const buildMode = useGameUIStore((s) => s.buildMode)
  const startPlacing = useGameUIStore((s) => s.startPlacing)
  const cancel = useGameUIStore((s) => s.cancel)

  return (
    <div style={panel}>
      <h3 style={{ margin: '0 0 8px' }}>Construir</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {OPTIONS.map((o) => {
          const active = buildMode.type === 'placing' && buildMode.buildingType === o.key
          return (
            <button
              key={o.key}
              onClick={() => startPlacing(o.key)}
              aria-pressed={active}
              style={{ ...item, background: active ? '#2c3a5a' : '#222838', borderColor: active ? '#6c8ebf' : '#39415a' }}
            >
              {o.name}
            </button>
          )
        })}
      </div>
      {buildMode.type === 'placing' && (
        <p style={{ fontSize: 12, color: '#9aa3b2', marginTop: 8 }}>
          Clique numa célula vazia… <button onClick={cancel} style={item}>cancelar</button>
        </p>
      )}
    </div>
  )
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 80,
  left: 16,
  width: 200,
  padding: 12,
  background: 'rgba(17,20,28,0.9)',
  color: '#fff',
  borderRadius: 8,
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const item: CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#222838',
  color: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
}
