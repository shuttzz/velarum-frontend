import { useEffect, useState } from 'react'

// useNow devolve o instante atual (ms) e re-renderiza a cada `intervalMs` — para contadores
// regressivos (chegada de marcha, conclusão de recrutamento) sem depender do servidor.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// secondsUntil devolve quantos segundos faltam até `iso` (>= 0).
export function secondsUntil(iso: string, nowMs: number): number {
  const ms = new Date(iso).getTime() - nowMs
  return ms > 0 ? Math.ceil(ms / 1000) : 0
}
