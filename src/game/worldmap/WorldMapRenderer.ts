import { Application, Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js'

// Renderer PixiJS do MAPA-MUNDO. Modelo POI (estilo Rise of Kingdoms): fundo ambiente +
// regiões como MARCADORES espalhados; o hex NÃO é desenhado (só revela um contorno sutil ao
// selecionar). Pan/zoom; câmera dá fit automático em todas as regiões. Pixi isolado aqui — o
// React passa o estado e recebe o id selecionado.

const HEX = 64 // passo de coordenada (mantém o mapeamento axial→pixel p/ posicionar marcadores)
const SQRT3 = Math.sqrt(3)
const MAX_SCALE = 2.6 // zoom máximo (in). O zoom MÍNIMO (out) é DINÂMICO = fit do mundo inteiro.
const MARKER_R = 22
const WORLD_HALF = 50 // meia-largura do mundo (coords): mundo COMPACTO finito de -50..50 em x e y

// Cor por região (na MESMA ordem de WorldRegions): tinta sutil do quadrante na visão Mundo.
const REGION_COLORS = [0x6a7a3a, 0x6b6b72, 0x3a6a7a, 0x6a3a7a]

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
  worldView?: boolean // true = visão geral do mundo (zoom-out + divisões de região)
  regions?: { label: string; q: number; r: number }[] // centros das regiões, relativos ao jogador
  worldOrigin?: { q: number; r: number } // o (0,0) do mundo, relativo ao jogador (p/ as linhas)
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
  private readonly regionLayer = new Container() // overlay da visão Mundo (linhas + rótulos)
  private readonly content = new Container() // marcadores + rótulos
  private state: WorldMapState | null = null
  private onSelect: ((id: string | null) => void) | null = null
  private fitKey = '' // chave do último fit (refaz o fit quando muda: nº de hexes-núcleo + modo)
  private hoveredRegion = -1 // índice da região sob o mouse; -1 = nenhuma
  private overlayVisible = false // overlay de regiões aparente no zoom atual (dirige hover/redraw)

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
    this.world.addChild(this.regionLayer)
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

    // Fit: na visão Mundo enquadra todas as regiões; na visão Região, a área do jogador (cidade +
    // províncias; vizinhos não contam). Refaz quando o modo ou o nº de hexes-núcleo muda.
    const coreCount = state.hexes.reduce((n, h) => (h.kind !== 'neighbor' ? n + 1 : n), 0)
    const key = `${state.worldView ? 'w' : 'r'}:${coreCount}`
    if (this.fitKey !== key) {
      if (state.worldView) this.fitToWorld()
      else this.fitToContent()
      this.fitKey = key
    }

    this.drawBackground()
    this.drawRegionOverlay()

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

    // Trava o viewport dentro do mundo ao fim de TODO desenho (não só no fit): garante que
    // re-renders por poll/seleção não deixem o pan escapar para o void.
    this.clampToWorld()
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
    // Borda do MUNDO (finito): retângulo pelos 4 cantos. Marca o limite — não há nada além.
    const c = this.worldCorners()
    g.poly([c[0].x, c[0].y, c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y]).stroke({ width: 3, color: 0x4a5570, alpha: 0.85 })
    this.bg.addChild(g)
  }

  // Os 4 cantos do mundo (em pixels do container), relativos ao jogador (via worldOrigin).
  private worldCorners() {
    const o = this.state?.worldOrigin ?? { q: 0, r: 0 }
    const corner = (sx: number, sy: number) => axialToPixel(sx * WORLD_HALF + o.q, sy * WORLD_HALF + o.r)
    return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
  }

  // Trava o pan dentro do mundo: o viewport não pode passar das bordas (sem vazio infinito).
  private clampToWorld() {
    const app = this.app
    if (!app) return
    const c = this.worldCorners()
    const minX = Math.min(...c.map((p) => p.x))
    const maxX = Math.max(...c.map((p) => p.x))
    const minY = Math.min(...c.map((p) => p.y))
    const maxY = Math.max(...c.map((p) => p.y))
    const s = this.world.scale.x
    const clampAxis = (pos: number, lo: number, hi: number, screen: number) => {
      const worldPx = (hi - lo) * s
      if (worldPx <= screen) return screen / 2 - ((lo + hi) / 2) * s // mundo menor que a tela → centra
      return Math.min(-lo * s, Math.max(screen - hi * s, pos)) // senão, mantém o viewport dentro
    }
    this.world.position.x = clampAxis(this.world.position.x, minX, maxX, app.screen.width)
    this.world.position.y = clampAxis(this.world.position.y, minY, maxY, app.screen.height)
  }

  // Overlay da visão Mundo: cada quadrante PINTADO com a cor da região (divisões claras) + cruz de
  // divisão + moldura do mundo + rótulos. Traço e texto são CONTRA-ESCALADOS (1/s) p/ ficarem em
  // tamanho de TELA constante apesar do zoom-out forte da visão geral. Realça o quadrante do hover.
  private drawRegionOverlay() {
    this.regionLayer.removeChildren().forEach((c) => c.destroy({ children: true }))
    const state = this.state
    if (!state || !state.regions) {
      this.overlayVisible = false
      return
    }
    const s = this.world.scale.x || 1
    // Overlay dirigido pelo ZOOM (sem modo booleano): CHEIO no fit do mundo (zoom mínimo), some
    // gradualmente conforme dá zoom in até ver o conteúdo; reaparece ao dar zoom out.
    const minS = this.worldFitScale()
    const fade = Math.max(0, Math.min(1, 1 - (s - minS) / (minS * 5)))
    this.regionLayer.alpha = fade
    this.overlayVisible = fade > 0.02
    if (!this.overlayVisible) {
      this.hoveredRegion = -1
      return
    }
    const inv = 1 / s

    const o = state.worldOrigin ? axialToPixel(state.worldOrigin.q, state.worldOrigin.r) : { x: 0, y: 0 }
    const c = this.worldCorners()
    const minX = Math.min(...c.map((p) => p.x))
    const maxX = Math.max(...c.map((p) => p.x))
    const minY = Math.min(...c.map((p) => p.y))
    const maxY = Math.max(...c.map((p) => p.y))

    // Preenche cada quadrante (relativo ao centro do mundo) com a cor da sua região; o hover destaca.
    const fills = new Graphics()
    state.regions.forEach((rg, i) => {
      const { x, y } = axialToPixel(rg.q, rg.r)
      const x0 = x >= o.x ? o.x : minX
      const x1 = x >= o.x ? maxX : o.x
      const y0 = y >= o.y ? o.y : minY
      const y1 = y >= o.y ? maxY : o.y
      const alpha = i === this.hoveredRegion ? 0.36 : 0.16
      fills.rect(x0, y0, x1 - x0, y1 - y0).fill({ color: REGION_COLORS[i % REGION_COLORS.length], alpha })
    })
    this.regionLayer.addChild(fills)

    // Cruz de divisão (até a borda) + moldura do mundo — bem visíveis, em tamanho de tela.
    const lines = new Graphics()
    lines.moveTo(minX, o.y).lineTo(maxX, o.y) // horizontal
    lines.moveTo(o.x, minY).lineTo(o.x, maxY) // vertical
    lines.rect(minX, minY, maxX - minX, maxY - minY) // moldura
    lines.stroke({ width: 3 * inv, color: 0x9aa6c4, alpha: 0.95 })
    this.regionLayer.addChild(lines)

    // Rótulos: tamanho de tela constante (escala 1/s) + sombra p/ legibilidade; realce no hover.
    state.regions.forEach((rg, i) => {
      const { x, y } = axialToPixel(rg.q, rg.r)
      const hovered = i === this.hoveredRegion
      const label = new Text({
        text: rg.label,
        style: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: 24,
          fontWeight: '700',
          fill: hovered ? 0xffffff : 0xd6dcea,
          align: 'center',
          dropShadow: { color: 0x000000, alpha: 0.85, blur: 4, distance: 0 },
        },
      })
      label.anchor.set(0.5)
      label.scale.set(inv * (hovered ? 1.15 : 1))
      label.position.set(x, y)
      label.eventMode = 'none'
      this.regionLayer.addChild(label)
    })
  }

  // Detecta sobre qual quadrante/região o mouse está (visão Mundo) e redesenha o overlay se mudou.
  private updateHover(e: FederatedPointerEvent) {
    const state = this.state
    if (!state || !state.regions) return
    const s = this.world.scale.x || 1
    const wx = (e.global.x - this.world.position.x) / s
    const wy = (e.global.y - this.world.position.y) / s
    const o = state.worldOrigin ? axialToPixel(state.worldOrigin.q, state.worldOrigin.r) : { x: 0, y: 0 }
    let idx = -1
    state.regions.forEach((rg, i) => {
      const { x, y } = axialToPixel(rg.q, rg.r)
      if (wx >= o.x === (x >= o.x) && wy >= o.y === (y >= o.y)) idx = i
    })
    if (idx !== this.hoveredRegion) {
      this.hoveredRegion = idx
      this.drawRegionOverlay()
    }
  }

  // Zoom MÍNIMO dinâmico: a escala em que o mundo INTEIRO (borda ±WORLD_HALF + folga) cabe na
  // tela. É o piso do zoom-out — não dá pra afastar mais que a visão de mundo.
  private worldFitScale(): number {
    const app = this.app
    if (!app) return 1
    const c = this.worldCorners()
    const minX = Math.min(...c.map((p) => p.x))
    const maxX = Math.max(...c.map((p) => p.x))
    const minY = Math.min(...c.map((p) => p.y))
    const maxY = Math.max(...c.map((p) => p.y))
    const pad = HEX * 1.5
    const cw = maxX - minX + pad * 2
    const ch = maxY - minY + pad * 2
    return Math.min(MAX_SCALE, Math.min(app.screen.width / cw, app.screen.height / ch))
  }

  // Visão Mundo: enquadra a BORDA do mundo inteiro (zoom mínimo), centralizado. TUDO cabe, sem scroll.
  private fitToWorld() {
    const app = this.app
    const state = this.state
    if (!app || !state) return
    const c = this.worldCorners()
    const minX = Math.min(...c.map((p) => p.x))
    const maxX = Math.max(...c.map((p) => p.x))
    const minY = Math.min(...c.map((p) => p.y))
    const maxY = Math.max(...c.map((p) => p.y))
    const s = this.worldFitScale()
    this.world.scale.set(s)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    this.world.position.set(app.screen.width / 2 - cx * s, app.screen.height / 2 - cy * s)
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
    const s = Math.max(this.worldFitScale(), Math.min(MAX_SCALE, Math.min(app.screen.width / cw, app.screen.height / ch) * 0.92))
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
    if (this.overlayVisible) this.updateHover(e)
    if (!this.panning) return
    this.world.position.x += e.global.x - this.lastX
    this.world.position.y += e.global.y - this.lastY
    this.lastX = e.global.x
    this.lastY = e.global.y
    this.clampToWorld()
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
    // Piso do zoom = fit do mundo (zoom-out trava na visão de mundo); teto = MAX_SCALE.
    const next = Math.max(this.worldFitScale(), Math.min(MAX_SCALE, cur * factor))
    if (next === cur) return
    const rect = app.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const wx = (px - this.world.position.x) / cur
    const wy = (py - this.world.position.y) / cur
    this.world.scale.set(next)
    this.world.position.set(px - wx * next, py - wy * next)
    this.clampToWorld()
    this.drawRegionOverlay() // re-contra-escala / refaz o fade do overlay ao novo zoom
  }
}
