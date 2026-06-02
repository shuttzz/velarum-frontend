import { type ReactNode } from 'react'

// Container fullscreen do jogo: o canvas e o HUD são posicionados sobre ele.
export function GameLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#11141c' }}>
      {children}
    </div>
  )
}
