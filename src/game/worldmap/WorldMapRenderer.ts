import { Application, Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js'

// Renderer PixiJS do MAPA-MUNDO: tabuleiro hex com pan/zoom. Pixi fica ISOLADO aqui — o React
// só passa o estado (WorldMapState) e recebe o evento de seleção. Cidade no centro (0,0); anéis
// concêntricos (províncias no anel 1, nós de coleta no anel 2 depois).

const HEX = 64 // raio do hexágono (px, em coords de mundo)
const SQRT3 = Math.sqrt(3)
const MIN_SCALE = 0.4
const MAX_SCALE = 2.6

export type MapHex = {
  id: string
  kind: 'city' | 'province'
  q: number
  r: number
  title: string
  subtitle?: string // ex.: "⚔ 60 · ♥ 180" (já formatado pelo React)
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

type Palette = { fill: number; stroke: number }
function paletteFor(h: MapHex, selected: boolean): Palette {
  if (h.kind === 'city') return { fill: 0x2c3a5a, stroke: selected ? 0xe0b04a : 0x6c8ebf }
  if (h.status === 'conquered') return { fill: 0x244a33, stroke: selected ? 0xe0b04a : 0x4a8f63 }
  return { fill: 0x4a2c2c, stroke: selected ? 0xe0b04a : 0x9f5a5a }
}

export class WorldMapRenderer {
  private app: Application | null = null
  private destroyed = false
  private readonly world = new Container() // sofre pan/zoom
  private readonly content = new Container() // hexes
  private state: WorldMapState | null = null
  private onSelect: ((id: string | null) => void) | null = null
  private centered = false

  // pan
  private panning = false
  private lastX = 0
  private lastY = 0

  async mount(host: HTMLElement) {
    const app = new Application()
    await app.init({ resizeTo: host, background: 0x0d1016, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
    if (this.destroyed) {
      app.destroy(true, { children: true })
      return
    }
    host.appendChild(app.canvas)
    this.app = app
    app.stage.addChild(this.world)
    this.world.addChild(this.content)

    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen // acompanha o resize (Rectangle vivo do Pixi)
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
    const app = this.app
    const state = this.state
    if (!app || !state) return

    // Centraliza a câmera na cidade na primeira renderização.
    if (!this.centered) {
      this.world.position.set(app.screen.width / 2, app.screen.height / 2)
      this.centered = true
    }

    this.content.removeChildren().forEach((c) => c.destroy({ children: true }))

    for (const h of state.hexes) {
      const { x, y } = axialToPixel(h.q, h.r)
      const selected = h.id === state.selectedId
      const pal = paletteFor(h, selected)

      const g = new Graphics()
      g.poly(hexPoly(HEX)).fill(pal.fill).stroke({ width: selected ? 4 : 2, color: pal.stroke })
      g.position.set(x, y)
      if (h.kind === 'province') {
        g.eventMode = 'static'
        g.cursor = 'pointer'
        g.on('pointertap', (e: FederatedPointerEvent) => {
          e.stopPropagation() // não deixa virar "clique no fundo" (deselect)
          this.onSelect?.(h.id)
        })
      }
      this.content.addChild(g)

      const title = new Text({
        text: h.title,
        style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: 0xffffff, align: 'center' },
      })
      title.anchor.set(0.5)
      title.position.set(x, y - 2)
      title.eventMode = 'none'
      this.content.addChild(title)

      const sub = h.marching ? '⏳' : (h.subtitle ?? '')
      if (sub) {
        const st = new Text({
          text: sub,
          style: { fontFamily: 'system-ui, sans-serif', fontSize: 11, fill: 0xb6bdca, align: 'center' },
        })
        st.anchor.set(0.5)
        st.position.set(x, y + 16)
        st.eventMode = 'none'
        this.content.addChild(st)
      }
    }
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

  // Clique no fundo (não capturado por um hex) → limpa a seleção.
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
    // mantém o ponto do mundo sob o cursor fixo durante o zoom
    const wx = (px - this.world.position.x) / cur
    const wy = (py - this.world.position.y) / cur
    this.world.scale.set(next)
    this.world.position.set(px - wx * next, py - wy * next)
  }
}
