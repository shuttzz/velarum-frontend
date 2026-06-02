import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { formatAmount } from './format'

type Amounts = { matter: number; energy: number; knowledge: number }
type Building = { slot: number; type: string; level: number }
type City = {
  id: string
  name: string
  era: number
  resources: Amounts
  rate: Amounts
  capacity: Amounts
  buildings: Building[]
  server_now: string
}

const BUILDING_NAMES: Record<string, string> = {
  lar_do_cla: 'Lar do Clã',
  viveiro_de_pedra: 'Viveiro de Pedra',
  fogueira_comunal: 'Fogueira Comunal',
  pedra_da_memoria: 'Pedra da Memória',
  celeiro_de_argila: 'Celeiro de Argila',
  canteiro_de_almas: 'Canteiro de Almas',
}

type Snapshot = { resources: Amounts; rate: Amounts; capacity: Amounts; at: number }

export function App() {
  const [city, setCity] = useState<City | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const snap = useRef<Snapshot | null>(null)
  const [, force] = useState(0)

  // Tick local: re-renderiza ~4x/s para os contadores "subirem" suavemente.
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 250)
    return () => clearInterval(t)
  }, [])

  function apply(c: City) {
    setCity(c)
    snap.current = { resources: c.resources, rate: c.rate, capacity: c.capacity, at: Date.now() }
    setError(null)
  }

  // Recurso exibido = valor no fetch + taxa * tempo decorrido no cliente (limitado ao teto).
  function shown(key: keyof Amounts): number {
    const s = snap.current
    if (!s) return 0
    const hours = (Date.now() - s.at) / 3_600_000
    return Math.min(s.capacity[key], s.resources[key] + s.rate[key] * hours)
  }

  async function newGame() {
    setBusy(true)
    try {
      const r = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      apply(await r.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function refresh(id: string) {
    try {
      const r = await fetch(`/api/cities/${id}`)
      if (r.ok) apply(await r.json())
    } catch {
      /* ignora erros transitórios de polling */
    }
  }

  async function build(type: string) {
    if (!city) return
    setBusy(true)
    try {
      const r = await fetch(`/api/cities/${city.id}/buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_type: type }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${r.status}`)
      }
      await refresh(city.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  // Polling: sincroniza com o servidor a cada 3s (pega conclusão de construção / nova produção).
  useEffect(() => {
    if (!city) return
    const t = setInterval(() => refresh(city.id), 3000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?.id])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720, margin: '0 auto', lineHeight: 1.5 }}>
      <h1>Velarum</h1>

      {!city && (
        <>
          <p>Funde sua civilização e veja os recursos crescerem.</p>
          <button onClick={newGame} disabled={busy} style={btn}>
            {busy ? 'Criando…' : 'Novo jogo'}
          </button>
        </>
      )}

      {city && (
        <>
          <h2>
            {city.name} <small style={{ color: '#888' }}>· Era {city.era}</small>
          </h2>

          <div style={{ display: 'flex', gap: 24, margin: '16px 0' }}>
            <ResourceBox label="Matéria" value={shown('matter')} cap={city.capacity.matter} rate={city.rate.matter} />
            <ResourceBox label="Energia" value={shown('energy')} cap={city.capacity.energy} rate={city.rate.energy} />
            <ResourceBox label="Conhecimento" value={shown('knowledge')} cap={city.capacity.knowledge} rate={city.rate.knowledge} />
          </div>

          <h3>Edifícios</h3>
          <ul>
            {city.buildings.map((b) => (
              <li key={b.slot}>
                {BUILDING_NAMES[b.type] ?? b.type} — nível {b.level} <small style={{ color: '#888' }}>(slot {b.slot})</small>
              </li>
            ))}
          </ul>

          <button onClick={() => build('viveiro_de_pedra')} disabled={busy} style={btn}>
            Construir Viveiro de Pedra (+8 Matéria/h, ~30s)
          </button>
        </>
      )}

      {error && <p style={{ color: 'crimson' }}>⚠ {error}</p>}
    </main>
  )
}

function ResourceBox({ label, value, cap, rate }: { label: string; value: number; cap: number; rate: number }) {
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ color: '#666', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
        {formatAmount(value)} <span style={{ fontSize: 13, color: '#aaa' }}>/ {formatAmount(cap)}</span>
      </div>
      <div style={{ fontSize: 12, color: rate > 0 ? 'green' : '#bbb' }}>+{rate}/h</div>
    </div>
  )
}

const btn: CSSProperties = {
  padding: '8px 16px',
  fontSize: 15,
  borderRadius: 8,
  border: '1px solid #ccc',
  cursor: 'pointer',
  background: '#f7f7f7',
}
