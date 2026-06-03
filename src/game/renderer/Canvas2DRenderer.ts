import type { IRenderer, RenderState, RendererEvents } from './IRenderer'
import { serverNow } from '../../lib/serverClock'

// Cores placeholder por tipo de edifício (no lugar de sprites). Trocar por imagens/Pixi depois.
const TYPE_COLOR: Record<string, string> = {
  lar_do_cla: '#cba14b',
  viveiro_de_pedra: '#8a8d91',
  fogueira_comunal: '#e0663b',
  pedra_da_memoria: '#6c8ebf',
  celeiro_de_argila: '#b5651d',
  canteiro_de_almas: '#9c3b3b',
}
const SHORT: Record<string, string> = {
  lar_do_cla: 'Lar',
  viveiro_de_pedra: 'Viveiro',
  fogueira_comunal: 'Fogo',
  pedra_da_memoria: 'Memória',
  celeiro_de_argila: 'Celeiro',
  canteiro_de_almas: 'Quartel',
}

const MARGIN = 48 // espaço entre a grade e as bordas da tela
const MIN_CELL = 20

// Renderer da cidade em Canvas 2D. O canvas é fullscreen; a grade ESCALA para preencher
// a viewport (tamanho de célula dinâmico), centralizada.
export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private w = 0
  private h = 0
  private cell = 48
  private offX = 0
  private offY = 0
  private state: RenderState | null = null
  private hover: { x: number; y: number } | null = null
  private cellHandlers = new Set<RendererEvents['cellClick']>()
  private buildingHandlers = new Set<RendererEvents['buildingClick']>()

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.addEventListener('click', this.onClick)
    canvas.addEventListener('mousemove', this.onMove)
    canvas.addEventListener('mouseleave', this.onLeave)
  }

  unmount(): void {
    this.canvas?.removeEventListener('click', this.onClick)
    this.canvas?.removeEventListener('mousemove', this.onMove)
    this.canvas?.removeEventListener('mouseleave', this.onLeave)
    this.canvas = null
    this.ctx = null
  }

  resize(width: number, height: number): void {
    this.w = width
    this.h = height
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
    this.draw()
  }

  render(state: RenderState): void {
    this.state = state
    this.draw()
  }

  on<K extends keyof RendererEvents>(event: K, handler: RendererEvents[K]): void {
    if (event === 'cellClick') this.cellHandlers.add(handler as unknown as RendererEvents['cellClick'])
    else this.buildingHandlers.add(handler as unknown as RendererEvents['buildingClick'])
  }

  off<K extends keyof RendererEvents>(event: K, handler: RendererEvents[K]): void {
    if (event === 'cellClick') this.cellHandlers.delete(handler as unknown as RendererEvents['cellClick'])
    else this.buildingHandlers.delete(handler as unknown as RendererEvents['buildingClick'])
  }

  private onClick = (e: MouseEvent) => {
    const st = this.state
    const canvas = this.canvas
    if (!st || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left - this.offX
    const py = e.clientY - rect.top - this.offY
    if (px < 0 || py < 0) return
    const gx = Math.floor(px / this.cell)
    const gy = Math.floor(py / this.cell)
    if (gx >= st.city.grid_w || gy >= st.city.grid_h) return
    const hit = st.city.buildings.find((b) => gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h)
    if (hit) this.buildingHandlers.forEach((fn) => fn(hit.id))
    else this.cellHandlers.forEach((fn) => fn(gx, gy))
  }

  private onMove = (e: MouseEvent) => {
    const st = this.state
    const canvas = this.canvas
    if (!st || !canvas) return
    const interactive = st.buildMode.type === 'placing' || (st.editMode && st.selectedBuildingId !== null)
    if (!interactive) {
      if (this.hover) {
        this.hover = null
        this.draw()
      }
      return
    }
    const rect = canvas.getBoundingClientRect()
    const gx = Math.floor((e.clientX - rect.left - this.offX) / this.cell)
    const gy = Math.floor((e.clientY - rect.top - this.offY) / this.cell)
    const inside = gx >= 0 && gy >= 0 && gx < st.city.grid_w && gy < st.city.grid_h
    const next = inside ? { x: gx, y: gy } : null
    if ((next?.x ?? -1) !== (this.hover?.x ?? -1) || (next?.y ?? -1) !== (this.hover?.y ?? -1)) {
      this.hover = next
      this.draw()
    }
  }

  private onLeave = () => {
    if (this.hover) {
      this.hover = null
      this.draw()
    }
  }

  private draw() {
    const ctx = this.ctx
    const st = this.state
    if (!ctx || !st || this.w === 0) return
    const { grid_w, grid_h, buildings } = st.city

    // Célula dinâmica: a grade preenche a viewport (menos uma margem), mantendo proporção.
    this.cell = Math.max(MIN_CELL, Math.floor(Math.min((this.w - MARGIN * 2) / grid_w, (this.h - MARGIN * 2) / grid_h)))
    const cell = this.cell
    const gpw = grid_w * cell
    const gph = grid_h * cell
    this.offX = Math.floor((this.w - gpw) / 2)
    this.offY = Math.floor((this.h - gph) / 2)

    ctx.clearRect(0, 0, this.w, this.h)
    ctx.fillStyle = '#11141c'
    ctx.fillRect(0, 0, this.w, this.h)

    ctx.save()
    ctx.translate(this.offX, this.offY)

    ctx.fillStyle = '#1b1f2a'
    ctx.fillRect(0, 0, gpw, gph)
    ctx.strokeStyle = '#2a3142'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= grid_w; gx++) {
      ctx.beginPath()
      ctx.moveTo(gx * cell + 0.5, 0)
      ctx.lineTo(gx * cell + 0.5, gph)
      ctx.stroke()
    }
    for (let gy = 0; gy <= grid_h; gy++) {
      ctx.beginPath()
      ctx.moveTo(0, gy * cell + 0.5)
      ctx.lineTo(gpw, gy * cell + 0.5)
      ctx.stroke()
    }

    const font = Math.max(11, Math.floor(cell * 0.18))
    const pad = Math.max(3, Math.floor(cell * 0.08))
    for (const b of buildings) {
      const x = b.x * cell
      const y = b.y * cell
      const w = b.w * cell
      const h = b.h * cell
      ctx.fillStyle = TYPE_COLOR[b.type] ?? '#4a5568'
      roundRect(ctx, x + pad, y + pad, w - 2 * pad, h - 2 * pad, 8)
      ctx.fill()
      if (b.id === st.selectedBuildingId) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 10)
        ctx.stroke()
      }
      ctx.fillStyle = '#ffffff'
      ctx.font = `${font}px system-ui, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(SHORT[b.type] ?? b.type, x + pad + 4, y + pad + 4)
      ctx.fillText('N' + b.level, x + pad + 4, y + pad + 6 + font)
    }

    // Construções/upgrades em andamento: placeholder "em obras" + contador regressivo (UTC).
    const nowMs = serverNow()
    for (const p of st.city.pending) {
      const px = p.x * cell
      const py = p.y * cell
      const remaining = Math.max(0, Math.ceil((Date.parse(p.finish_at) - nowMs) / 1000))
      const txt = remaining >= 60 ? `${Math.floor(remaining / 60)}m${String(remaining % 60).padStart(2, '0')}s` : `${remaining}s`

      if (!p.is_upgrade) {
        ctx.save()
        ctx.globalAlpha = 0.45
        ctx.fillStyle = TYPE_COLOR[p.building_type] ?? '#4a5568'
        roundRect(ctx, px + pad, py + pad, cell - 2 * pad, cell - 2 * pad, 8)
        ctx.fill()
        ctx.restore()
        ctx.setLineDash([6, 4])
        ctx.strokeStyle = '#d9b44a'
        ctx.lineWidth = 2
        roundRect(ctx, px + pad, py + pad, cell - 2 * pad, cell - 2 * pad, 8)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#e6e6e6'
        ctx.font = `${Math.max(10, Math.floor(font * 0.9))}px system-ui, sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText('em obras', px + pad + 4, py + pad + 4)
      }

      // pílula com o contador no rodapé da célula
      ctx.font = `bold ${font}px system-ui, sans-serif`
      ctx.textBaseline = 'alphabetic'
      const bw = ctx.measureText(txt).width + 12
      const bh = font + 8
      const bx = px + (cell - bw) / 2
      const by = py + cell - bh - 4
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      roundRect(ctx, bx, by, bw, bh, 6)
      ctx.fill()
      ctx.fillStyle = '#ffd86b'
      ctx.fillText(txt, bx + 6, by + bh - 6)
    }

    // Fantasma de posicionamento: segue o mouse ao construir ou mover (verde=válido, vermelho=ocupado).
    const interactive = st.buildMode.type === 'placing' || (st.editMode && st.selectedBuildingId !== null)
    if (interactive && this.hover) {
      const hx = this.hover.x
      const hy = this.hover.y
      const occupied = buildings.some(
        (b) => hx >= b.x && hx < b.x + b.w && hy >= b.y && hy < b.y + b.h && b.id !== st.selectedBuildingId,
      )
      ctx.fillStyle = occupied ? 'rgba(220,80,80,0.30)' : 'rgba(90,209,122,0.30)'
      ctx.strokeStyle = occupied ? '#dc5050' : '#5ad17a'
      ctx.lineWidth = 2
      roundRect(ctx, hx * cell + 2, hy * cell + 2, cell - 4, cell - 4, 6)
      ctx.fill()
      ctx.stroke()
    }

    ctx.restore()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
