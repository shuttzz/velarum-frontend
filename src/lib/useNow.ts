import { useEffect, useState } from 'react'
import { serverNow } from './serverClock'

// useNow devolve o "agora do SERVIDOR" (ms) e re-renderiza a cada `intervalMs` — para
// contadores regressivos ancorados no servidor (não no relógio do cliente). O intervalo só
// dita a cadência de render; o valor vem de serverNow() (monotônico, anti-skew).
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// secondsUntil devolve quantos segundos faltam até `iso` (>= 0), dado um "agora" em ms.
export function secondsUntil(iso: string, nowMs: number): number {
  const ms = new Date(iso).getTime() - nowMs
  return ms > 0 ? Math.ceil(ms / 1000) : 0
}
