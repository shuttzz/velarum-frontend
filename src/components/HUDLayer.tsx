import { type ReactNode } from 'react'

// Camada de UI sobreposta ao canvas. pointer-events:none deixa os cliques "passarem"
// para o canvas; cada widget reativa pointer-events:auto onde precisa de interação.
export function HUDLayer({ children }: { children: ReactNode }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>{children}</div>
}
