import { useEffect, useRef, type CSSProperties } from 'react'
import { WorldMapRenderer, type MapHex } from './WorldMapRenderer'

// Ponte React↔Pixi do mapa-mundo: monta o renderer, repassa os hexes/estado e encaminha a
// seleção de volta ao React. O Pixi cria seu próprio <canvas> dentro do host.
export function WorldMapCanvas({
  hexes,
  selectedId,
  onSelect,
  worldView = false,
  regions,
  worldOrigin,
}: {
  hexes: MapHex[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  worldView?: boolean
  regions?: { label: string; q: number; r: number }[]
  worldOrigin?: { q: number; r: number }
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<WorldMapRenderer | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const r = new WorldMapRenderer()
    rendererRef.current = r
    r.setSelectHandler((id) => onSelectRef.current(id))
    void r.mount(host)
    return () => {
      rendererRef.current = null
      r.destroy()
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.render({ hexes, selectedId, worldView, regions, worldOrigin })
  }, [hexes, selectedId, worldView, regions, worldOrigin])

  return <div ref={hostRef} style={host} />
}

const host: CSSProperties = { position: 'absolute', inset: 0 }
