// Relógio ancorado no SERVIDOR — nunca confiar no relógio do cliente (pode estar errado:
// bateria de CMOS morta, NTP, etc.). O servidor manda `server_now` (UTC) em cada resposta;
// ancoramos nesse instante e medimos a passagem do tempo com performance.now() (MONOTÔNICO,
// imune a ajustes/saltos do relógio do SO). Cf. pesquisa: offset + RTT/2 + performance.now().

interface Anchor {
  serverAtCapture: number // server_now (ms epoch) corrigido por metade do round-trip
  capturedAt: number // performance.now() no momento da captura
}

let anchor: Anchor | null = null

// updateServerClock registra o tempo do servidor. Chamar a cada resposta que traga server_now.
// roundTripMs (opcional) corrige o atraso de transmissão (metade do RTT).
export function updateServerClock(serverNowMs: number, roundTripMs = 0): void {
  if (!Number.isFinite(serverNowMs)) return
  anchor = {
    serverAtCapture: serverNowMs + roundTripMs / 2,
    capturedAt: performance.now(),
  }
}

// serverNow devolve o "agora" do servidor (ms epoch). Antes da 1ª resposta, cai no relógio
// local como fallback (evita NaN no 1º render).
export function serverNow(): number {
  if (!anchor) return Date.now()
  return anchor.serverAtCapture + (performance.now() - anchor.capturedAt)
}

// secondsUntil: segundos restantes (>= 0) até um instante ISO, pelo relógio do servidor.
export function secondsUntil(iso: string): number {
  const ms = new Date(iso).getTime() - serverNow()
  return ms > 0 ? Math.ceil(ms / 1000) : 0
}
