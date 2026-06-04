import { Application, Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js'

// Renderer PixiJS do MAPA-MUNDO. Modelo POI (estilo Rise of Kingdoms): fundo ambiente +
// regiões como MARCADORES espalhados; o hex NÃO é desenhado (só revela um contorno sutil ao
// selecionar). Pan/zoom; câmera dá fit automático em todas as regiões. Pixi isolado aqui — o
// React passa o estado e recebe o id selecionado.

const HEX = 64 // passo de coordenada (mantém o mapeamento axial→pixel p/ posicionar marcadores)
const SQRT3 = Math.sqrt(3)
const MIN_SCALE = 0.35
const MAX_SCALE = 2.6
const MARKER_R = 22

export type MapHex = {
  id: string
  kind: 'city' | 'province' | 'neighbor'
  q: number
  r: number
  title: string
  subtitle?: string
  status?: 'unconquered' | 'conquered'
  marching?: boolean
}

export type WorldMapState = {
  hexes: MapHex[]
  selectedId: string | null
}

function axialToPixel(q: number, r: number) {
  return { x: HEX * SQRT3 * (q + r / 2), y: HEX * 1.5 * r }
}

function hexPoly(s: number): number[] {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push(Math.cos(a) * s, Math.sin(a) * s)
  }
  return pts
}

function paletteFor(h: MapHex, selected: boolean): { fill: number; stroke: number } {
  if (h.kind === 'city') return { fill: 0x2c3a5a, stroke: selected ? 0xe0b04a : 0x8fb0e0 }
  if (h.kind === 'neighbor') return { fill: 0x32384a, stroke: 0x6b7686 } // cidade vizinha (neutra)
  if (h.status === 'conquered') return { fill: 0x244a33, stroke: selected ? 0xe0b04a : 0x5fbf85 }
  return { fill: 0x4a2c2c, stroke: selected ? 0xe0b04a : 0xc27a7a }
}

export class WorldMapRenderer {
  private app: Application | null = null
  private destroyed = false
  private readonly world = new Container() // sofre pan/zoom
  private readonly bg = new Container() // fundo ambiente (anéis), em coords de mundo
  private readonly content = new Container() // marcadores + rótulos
  private state: WorldMapState | null = null
  private onSelect: ((id: string | null) => void) | null = null
  private fitCount = -1 // nº de marcadores do último fit (refaz o fit quando muda)

  private panning = false
  private lastX = 0
  private lastY = 0

  async mount(host: HTMLElement) {
    const app = new Application()
    await app.init({ resizeTo: host, background: 0x0b0e14, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
    if (this.destroyed) {
      app.destroy(true, { children: true })
      return
    }
    host.appendChild(app.canvas)
    this.app = app
    app.stage.addChild(this.world)
    this.world.addChild(this.bg)
    this.world.addChild(this.content)

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', this.handleDown)
    app.stage.on('globalpointermove', this.handleMove)
    app.stage.on('pointerup', this.handleUp)
    app.stage.on('pointerupoutside', this.handleUp)
    app.stage.on('pointertap', this.handleBackgroundTap)
    app.canvas.addEventListener('wheel', this.handleWheel, { passive: false })

    if (this.state) this.draw()
  }

  setSelectHandler(cb: (id: string | null) => void) {
    this.onSelect = cb
  }

  render(state: WorldMapState) {
    this.state = state
    if (this.app) this.draw()
  }

  destroy() {
    this.destroyed = true
    if (this.app) {
      this.app.canvas.removeEventListener('wheel', this.handleWheel)
      this.app.destroy(true, { children: true })
      this.app = null
    }
  }

  // --- desenho ---
  private draw() {
    const state = this.state
    if (!this.app || !state) return

    // Fit automático na ÁREA do jogador (cidade + províncias); vizinhos NÃO contam (senão a
    // câmera afastaria demais p/ caber uma cidade longe). Refaz só quando o nº de hexes-núcleo muda.
    const coreCount = state.hexes.reduce((n, h) => (h.kind !== 'neighbor' ? n + 1 : n), 0)
    if (this.fitCount !== coreCount) {
      this.fitToContent()
      this.fitCount = coreCount
    }

    this.drawBackground()

    this.content.removeChildren().forEach((c) => c.destroy({ children: true }))
    for (const h of state.hexes) {
      const { x, y } = axialToPixel(h.q, h.r)
      const selected = h.id === state.selectedId
      const isCity = h.kind === 'city'
      const r = isCity ? 27 : h.kind === 'neighbor' ? 18 : MARKER_R
      const pal = paletteFor(h, selected)

      const m = new Graphics()
      if (selected) m.poly(hexPoly(HEX)).stroke({ width: 2, color: 0xe0b04a, alpha: 0.45 }) // revela o hex
      m.circle(0, 0, r).fill(pal.fill).stroke({ width: selected ? 4 : 2.5, color: h.marching ? 0xe0b04a : pal.stroke })
      m.position.set(x, y)
      if (h.kind === 'province') {
        m.eventMode = 'static'
        m.cursor = 'pointer'
        m.on('pointertap', (e: FederatedPointerEvent) => {
          e.stopPropagation()
          this.onSelect?.(h.id)
        })
      }
      this.content.addChild(m)

      const title = new Text({
        text: h.title,
        style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: 0xffffff, align: 'center' },
      })
      title.anchor.set(0.5, 0)
      title.position.set(x, y + r + 4)
      title.eventMode = 'none'
      this.content.addChild(title)

      const sub = h.marching ? '⏳' : (h.subtitle ?? '')
      if (sub) {
        const st = new Text({
          text: sub,
          style: { fontFamily: 'system-ui, sans-serif', fontSize: 11, fill: 0x9aa3b2, align: 'center' },
        })
        st.anchor.set(0.5, 0)
        st.position.set(x, y + r + 21)
        st.eventMode = 'none'
        this.content.addChild(st)
      }
    }
  }

  // Fundo ambiente: anéis de distância concêntricos na capital + leve brilho no centro.
  private drawBackground() {
    const state = this.state
    if (!state) return
    this.bg.removeChildren().forEach((c) => c.destroy())
    let maxR = 3 * HEX
    for (const h of state.hexes) {
      const { x, y } = axialToPixel(h.q, h.r)
      maxR = Math.max(maxR, Math.hypot(x, y))
    }
    const g = new Graphics()
    const step = HEX * 1.7
    for (let rr = step; rr <= maxR + step; rr += step) {
      g.circle(0, 0, rr).stroke({ width: 1, color: 0x1a2030, alpha: 0.9 })
    }
    g.circle(0, 0, HEX * 0.6).fill({ color: 0x2c3a5a, alpha: 0.18 })
    this.bg.addChild(g)
  }

  private fitToContent() {
    const app = this.app
    const state = this.state
    if (!app || !state || state.hexes.length === 0) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const h of state.hexes) {
      if (h.kind === 'neighbor') continue // vizinhos não entram no enquadramento inicial
      const { x, y } = axialToPixel(h.q, h.r)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    if (minX === Infinity) return
    const pad = HEX * 2
    minX -= pad
    minY -= pad
    maxX += pad
    maxY += pad
    const cw = maxX - minX
    const ch = maxY - minY
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(app.screen.width / cw, app.screen.height / ch) * 0.92))
    this.world.scale.set(s)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    this.world.position.set(app.screen.width / 2 - cx * s, app.screen.height / 2 - cy * s)
  }

  // --- pan / zoom ---
  private handleDown = (e: FederatedPointerEvent) => {
    this.panning = true
    this.lastX = e.global.x
    this.lastY = e.global.y
  }

  private handleMove = (e: FederatedPointerEvent) => {
    if (!this.panning) return
    this.world.position.x += e.global.x - this.lastX
    this.world.position.y += e.global.y - this.lastY
    this.lastX = e.global.x
    this.lastY = e.global.y
  }

  private handleUp = () => {
    this.panning = false
  }

  private handleBackgroundTap = () => {
    this.onSelect?.(null)
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const app = this.app
    if (!app) return
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const cur = this.world.scale.x
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cur * factor))
    if (next === cur) return
    const rect = app.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const wx = (px - this.world.position.x) / cur
    const wy = (py - this.world.position.y) / cur
    this.world.scale.set(next)
    this.world.position.set(px - wx * next, py - wy * next)
  }
}
