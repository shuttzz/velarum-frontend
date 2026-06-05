import { describe, expect, it } from 'vitest'
import { predictAutoResolve, type UnitStat } from './predict'

// Stats espelhando config.Era1Units (lanceiro atk 10/hp 30; arqueiro atk 14/hp 20).
const stats: Record<string, UnitStat> = {
  lanceiro: { attack: 10, hp: 30 },
  arqueiro: { attack: 14, hp: 20 },
}
const stat = (k: string) => stats[k]

describe('predictAutoResolve', () => {
  it('vence defesa fraca com poucas perdas (win)', () => {
    // 20 lanceiros (atk 200, hp 600) vs def 30/180: rd=ceil(180/200)=1; ra=ceil(600/30)=20 →
    // vitória. dano sofrido = 1×30 = 30 → 1 baixa (5% < 20% → "win").
    const p = predictAutoResolve({ lanceiro: 20 }, stat, { attack: 30, hp: 180 })
    expect(p.attackerWins).toBe(true)
    expect(p.losses.lanceiro).toBe(1)
    expect(p.survivors.lanceiro).toBe(19)
    expect(p.tier).toBe('win')
  })

  it('vence sem perdas (certain_win)', () => {
    // Defesa sem ataque → 0 baixas.
    const p = predictAutoResolve({ lanceiro: 20 }, stat, { attack: 0, hp: 100 })
    expect(p.attackerWins).toBe(true)
    expect(p.totalLosses).toBe(0)
    expect(p.tier).toBe('certain_win')
  })

  it('vence mas perde muita tropa (risky)', () => {
    // 20 lanceiros vs def 200/200: rd=1, ra=3 → vitória; dano 200 → 6 baixas (30% > 20% → risky).
    const p = predictAutoResolve({ lanceiro: 20 }, stat, { attack: 200, hp: 200 })
    expect(p.attackerWins).toBe(true)
    expect(p.tier).toBe('risky')
  })

  it('perde mas arranha a defesa (no_chance)', () => {
    // 5 lanceiros (atk50) vs def 100/200: ra=2 → dano 100 = 50% da defesa → "sem chances".
    const p = predictAutoResolve({ lanceiro: 5 }, stat, { attack: 100, hp: 200 })
    expect(p.attackerWins).toBe(false)
    expect(p.tier).toBe('no_chance')
  })

  it('perde sem arranhar (suicide)', () => {
    // 5 lanceiros vs def 100/600: ra=2 → dano 100 = 17% da defesa → suicídio.
    const p = predictAutoResolve({ lanceiro: 5 }, stat, { attack: 100, hp: 600 })
    expect(p.attackerWins).toBe(false)
    expect(p.totalSurvivors).toBe(0)
    expect(p.tier).toBe('suicide')
  })

  it('exército vazio → derrota total (suicide)', () => {
    const p = predictAutoResolve({}, stat, { attack: 10, hp: 50 })
    expect(p.attackerWins).toBe(false)
    expect(p.totalLosses).toBe(0)
    expect(p.tier).toBe('suicide')
  })

  it('distribui perdas entre tipos (misto)', () => {
    const p = predictAutoResolve({ lanceiro: 10, arqueiro: 10 }, stat, { attack: 40, hp: 100 })
    expect(p.attackerWins).toBe(true)
    expect(p.survivors).toHaveProperty('lanceiro')
    expect(p.survivors).toHaveProperty('arqueiro')
    expect(p.totalSurvivors + p.totalLosses).toBe(20)
  })
})
