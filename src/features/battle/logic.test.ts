import { describe, expect, it } from 'vitest'
import type { Battle, BattleUnit } from '../../types/game'
import { attackableTargets, attackOption, canControl, hexDistance, hpFraction, movableHexes, stackCount, unitAt } from './logic'

function unit(over: Partial<BattleUnit> & Pick<BattleUnit, 'id' | 'owner' | 'pos'>): BattleUnit {
  return {
    key: 'lanceiro',
    hp: 60,
    hp_per: 30,
    attack: 10,
    defense: 8,
    move: 1,
    range: 1,
    ...over,
  }
}

function battle(units: BattleUnit[], over: Partial<Battle> = {}): Battle {
  return { w: 6, h: 6, units, turn: 'attacker', round: 0, max_rounds: 12, acted: {}, over: false, winner: 'attacker', ...over }
}

describe('hexDistance', () => {
  it('mede distância axial corretamente', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1)
    expect(hexDistance({ q: 0, r: 1 }, { q: 5, r: 3 })).toBe(7)
  })
})

describe('stackCount', () => {
  it('conta figuras pelo pool de HP (arredonda p/ cima)', () => {
    expect(stackCount(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 60, hp_per: 30 }))).toBe(2)
    expect(stackCount(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 1, hp_per: 30 }))).toBe(1)
    expect(stackCount(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 0, hp_per: 30 }))).toBe(0)
  })
})

describe('hpFraction', () => {
  it('é 1.0 com o stack cheio e cai com chip damage dentro do escalão', () => {
    expect(hpFraction(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 100, hp_per: 20 }))).toBe(1)
    expect(hpFraction(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 97, hp_per: 20 }))).toBeCloseTo(0.97)
  })
  it('é 0 quando morto', () => {
    expect(hpFraction(unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, hp: 0, hp_per: 20 }))).toBe(0)
  })
})

describe('canControl', () => {
  const a = unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 } })
  it('comanda atacante vivo que não agiu no turno do atacante', () => {
    expect(canControl(battle([a]), a)).toBe(true)
  })
  it('não comanda se já agiu, se morto, se não é seu turno, ou se acabou', () => {
    expect(canControl(battle([a], { acted: { a: true } }), a)).toBe(false)
    expect(canControl(battle([a], { turn: 'defender' }), a)).toBe(false)
    expect(canControl(battle([a], { over: true }), a)).toBe(false)
    expect(canControl(battle([{ ...a, hp: 0 }]), { ...a, hp: 0 })).toBe(false)
  })
})

describe('movableHexes', () => {
  it('lista vizinhos vazios dentro do alcance de movimento', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 2, r: 2 }, move: 1 })
    const hexes = movableHexes(battle([a]), a)
    // 6 vizinhos, todos dentro de uma grade 6x6 e vazios.
    expect(hexes).toHaveLength(6)
  })
  it('exclui células ocupadas', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 2, r: 2 }, move: 1 })
    const blocker = unit({ id: 'b', owner: 'defender', pos: { q: 3, r: 2 } })
    const hexes = movableHexes(battle([a, blocker]), a)
    expect(hexes.some((h) => h.q === 3 && h.r === 2)).toBe(false)
    expect(hexes).toHaveLength(5)
  })
})

describe('attackOption / attackableTargets', () => {
  it('ataca em pé quando o alvo já está no alcance', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 1, r: 1 }, range: 1 })
    const d = unit({ id: 'd', owner: 'defender', pos: { q: 2, r: 1 } })
    expect(attackOption(battle([a, d]), a, d)).toEqual({ target_id: 'd' })
  })
  it('move um passo e ataca quando precisa se aproximar', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 1 }, move: 1, range: 1 })
    const d = unit({ id: 'd', owner: 'defender', pos: { q: 2, r: 1 } })
    const opt = attackOption(battle([a, d]), a, d)
    expect(opt?.target_id).toBe('d')
    expect(opt?.move_to).toBeDefined()
    expect(hexDistance(opt!.move_to!, d.pos)).toBeLessThanOrEqual(1)
  })
  it('retorna null quando o alvo está longe demais', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, move: 1, range: 1 })
    const d = unit({ id: 'd', owner: 'defender', pos: { q: 5, r: 5 } })
    expect(attackOption(battle([a, d]), a, d)).toBeNull()
  })
  it('arqueiro (range 2) ataca à distância sem mover', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 0, r: 0 }, move: 1, range: 2 })
    const d = unit({ id: 'd', owner: 'defender', pos: { q: 2, r: 0 } })
    expect(attackOption(battle([a, d]), a, d)).toEqual({ target_id: 'd' })
  })
  it('attackableTargets ignora aliados e mortos', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 1, r: 1 } })
    const ally = unit({ id: 'a2', owner: 'attacker', pos: { q: 2, r: 1 } })
    const dead = unit({ id: 'd', owner: 'defender', pos: { q: 0, r: 1 }, hp: 0 })
    expect(attackableTargets(battle([a, ally, dead]), a)).toHaveLength(0)
  })
})

describe('unitAt', () => {
  it('acha unidade viva na célula, ignora mortas', () => {
    const a = unit({ id: 'a', owner: 'attacker', pos: { q: 1, r: 1 } })
    const dead = unit({ id: 'd', owner: 'defender', pos: { q: 2, r: 2 }, hp: 0 })
    expect(unitAt(battle([a, dead]), { q: 1, r: 1 })?.id).toBe('a')
    expect(unitAt(battle([a, dead]), { q: 2, r: 2 })).toBeNull()
  })
})
