// Lógica PURA da batalha tática no cliente (espelha as regras de internal/domain/battle do
// backend para feedback imediato — o servidor continua autoritativo). Sem React, testável.
import type { Battle, BattleHex, BattleUnit } from '../../types/game'

// Direções hex axiais (pointy-top), mesma ordem do backend (determinismo não importa aqui,
// mas mantém paridade conceitual).
export const HEX_DIRS: BattleHex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function hexEq(a: BattleHex, b: BattleHex): boolean {
  return a.q === b.q && a.r === b.r
}

export function hexKey(h: BattleHex): string {
  return `${h.q},${h.r}`
}

// Distância hex (axial → cubo).
export function hexDistance(a: BattleHex, b: BattleHex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

function inBounds(b: Battle, h: BattleHex): boolean {
  return h.q >= 0 && h.q < b.w && h.r >= 0 && h.r < b.h
}

export function unitAt(b: Battle, h: BattleHex): BattleUnit | null {
  return b.units.find((u) => u.hp > 0 && hexEq(u.pos, h)) ?? null
}

export function aliveUnits(b: Battle): BattleUnit[] {
  return b.units.filter((u) => u.hp > 0)
}

// Nº de "figuras" vivas no stack (espelha Unit.Count do backend).
export function stackCount(u: BattleUnit): number {
  if (u.hp <= 0 || u.hp_per <= 0) return 0
  return Math.ceil(u.hp / u.hp_per)
}

// Fração de vida do stack (0..1) relativa ao HP cheio do nº ATUAL de figuras (count×hp_per).
// Torna visível o "chip damage": tirar 3 de 100 baixa para 0.97 mesmo sem perder figura. Cai
// para ~1 de novo quando uma figura morre (e o count diminui) — comportamento de barra por escalão.
export function hpFraction(u: BattleUnit): number {
  const count = stackCount(u)
  if (count <= 0) return 0
  const full = count * u.hp_per
  return Math.max(0, Math.min(1, u.hp / full))
}

// Pode o jogador comandar esta unidade agora? (turno do atacante, unidade do atacante, viva,
// ainda não agiu nesta rodada).
export function canControl(b: Battle, u: BattleUnit): boolean {
  return !b.over && b.turn === 'attacker' && u.owner === 'attacker' && u.hp > 0 && !b.acted[u.id]
}

// Células de destino para mover a unidade (dist ≤ move, dentro da grade, vazias). O backend
// valida por distância em linha reta (sem pathfinding), então espelhamos isso.
export function movableHexes(b: Battle, u: BattleUnit): BattleHex[] {
  const out: BattleHex[] = []
  for (let q = 0; q < b.w; q++) {
    for (let r = 0; r < b.h; r++) {
      const h = { q, r }
      if (hexEq(h, u.pos)) continue
      if (!inBounds(b, h)) continue
      if (hexDistance(u.pos, h) > u.move) continue
      if (unitAt(b, h)) continue
      out.push(h)
    }
  }
  return out
}

// Ação de ataque a um alvo: se já está no alcance da posição atual, ataca em pé; senão acha a
// casa alcançável (vazia, dist ≤ move) mais próxima de onde o alvo fica no alcance, e ataca de
// lá (mover+atacar numa ação só, como o backend permite). null se não dá para alcançar.
export function attackOption(
  b: Battle,
  u: BattleUnit,
  target: BattleUnit,
): { move_to?: BattleHex; target_id: string } | null {
  if (target.owner === u.owner || target.hp <= 0) return null
  if (hexDistance(u.pos, target.pos) <= u.range) return { target_id: target.id }
  let best: BattleHex | null = null
  let bestDist = Infinity
  for (const h of movableHexes(b, u)) {
    if (hexDistance(h, target.pos) > u.range) continue
    const d = hexDistance(u.pos, h)
    if (d < bestDist) {
      best = h
      bestDist = d
    }
  }
  return best ? { move_to: best, target_id: target.id } : null
}

// Alvos inimigos que a unidade consegue atacar nesta ação (em pé ou após um passo).
export function attackableTargets(b: Battle, u: BattleUnit): BattleUnit[] {
  return aliveUnits(b).filter((t) => t.owner !== u.owner && attackOption(b, u, t) !== null)
}
