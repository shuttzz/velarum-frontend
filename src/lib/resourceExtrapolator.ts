import type { Amounts } from '../types/game'

// Extrapola os recursos atuais: valor + taxa(por hora) * tempo decorrido. SEM teto de acúmulo —
// recursos crescem sem limite; a "capacidade" é só a parcela PROTEGIDA contra saque (mostrada
// como 🛡 no HUD), não um teto. Espelha resource.At() do backend. Função pura.
export function extrapolate(base: Amounts, rate: Amounts, elapsedMs: number): Amounts {
  const hours = Math.max(0, elapsedMs) / 3_600_000
  const at = (k: keyof Amounts) => base[k] + rate[k] * hours
  return { matter: at('matter'), energy: at('energy'), knowledge: at('knowledge') }
}
