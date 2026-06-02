import { useEffect, type RefObject } from 'react'
import type { IRenderer } from './renderer/IRenderer'

// Mantém o canvas do tamanho do seu container (fullscreen) via ResizeObserver.
export function useResizeCanvas(canvasRef: RefObject<HTMLCanvasElement | null>, renderer: IRenderer) {
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const parent = el.parentElement ?? el
    const update = () => renderer.resize(parent.clientWidth, parent.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [canvasRef, renderer])
}
