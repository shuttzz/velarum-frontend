import type { IRenderer, RenderState, RendererEvents } from './IRenderer'

const CELL = 48

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

// Renderer da cidade em Canvas 2D. A grade é centralizada na viewport (canvas fullscreen).
export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private w = 0
  private h = 0
  private offX = 0
  private offY = 0
  private state: RenderState | null = null
  private cellHandlers = new Set<RendererEvents['cellClick']>()
  private buildingHandlers = new Set<RendererEvents['buildingClick']>()

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.addEventListener('click', this.onClick)
  }

  unmount(): void {
    this.canvas?.removeEventListener('click', this.onClick)
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
    const gx = Math.floor(px / CELL)
    const gy = Math.floor(py / CELL)
    if (gx >= st.city.grid_w || gy >= st.city.grid_h) return
    const hit = st.city.buildings.find((b) => gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h)
    if (hit) this.buildingHandlers.forEach((fn) => fn(hit.id))
    else this.cellHandlers.forEach((fn) => fn(gx, gy))
  }

  private draw() {
    const ctx = this.ctx
    const st = this.state
    if (!ctx || !st) return
    const { grid_w, grid_h, buildings } = st.city
    const gpw = grid_w * CELL
    const gph = grid_h * CELL
    this.offX = Math.max(0, Math.floor((this.w - gpw) / 2))
    this.offY = Math.max(0, Math.floor((this.h - gph) / 2))

    ctx.clearRect(0, 0, this.w, this.h)
    ctx.fillStyle = '#11141c'
    ctx.fillRect(0, 0, this.w, this.h)

    ctx.save()
    ctx.translate(this.offX, this.offY)

    ctx.fillStyle = '#1b1f2a'
    ctx.fillRect(0, 0, gpw, gph)
    ctx.strokeStyle = '#303749'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= grid_w; gx++) {
      ctx.beginPath()
      ctx.moveTo(gx * CELL + 0.5, 0)
      ctx.lineTo(gx * CELL + 0.5, gph)
      ctx.stroke()
    }
    for (let gy = 0; gy <= grid_h; gy++) {
      ctx.beginPath()
      ctx.moveTo(0, gy * CELL + 0.5)
      ctx.lineTo(gpw, gy * CELL + 0.5)
      ctx.stroke()
    }

    for (const b of buildings) {
      const x = b.x * CELL
      const y = b.y * CELL
      const w = b.w * CELL
      const h = b.h * CELL
      const pad = 4
      ctx.fillStyle = TYPE_COLOR[b.type] ?? '#4a5568'
      roundRect(ctx, x + pad, y + pad, w - 2 * pad, h - 2 * pad, 6)
      ctx.fill()
      if (b.id === st.selectedBuildingId) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 8)
        ctx.stroke()
      }
      ctx.fillStyle = '#ffffff'
      ctx.font = '11px system-ui, sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(SHORT[b.type] ?? b.type, x + 6, y + 6)
      ctx.fillText('N' + b.level, x + 6, y + 20)
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
