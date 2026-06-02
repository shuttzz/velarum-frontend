import { useEffect, useState } from 'react'

type Health = { status: string; service: string }

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, lineHeight: 1.5 }}>
      <h1>Velarum</h1>
      <p>Cliente web (esqueleto inicial). Status da conexão com o backend:</p>
      {health && (
        <pre style={{ color: 'green' }}>
          ✓ backend: {health.status} ({health.service})
        </pre>
      )}
      {error && <pre style={{ color: 'crimson' }}>✗ erro ao falar com o backend: {error}</pre>}
      {!health && !error && <pre>conectando…</pre>}
    </main>
  )
}
