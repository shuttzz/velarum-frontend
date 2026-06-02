import type { Amounts } from '../types/game'

// Extrapola os recursos atuais: valor + taxa(por hora) * tempo decorrido, limitado pela capacidade.
// Função pura — a animação dos contadores se baseia nela entre snapshots do servidor.
export function extrapolate(base: Amounts, rate: Amounts, capacity: Amounts, elapsedMs: number): Amounts {
  const hours = Math.max(0, elapsedMs) / 3_600_000
  const at = (k: keyof Amounts) => Math.min(capacity[k], base[k] + rate[k] * hours)
  return { matter: at('matter'), energy: at('energy'), knowledge: at('knowledge') }
}
