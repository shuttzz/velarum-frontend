import { describe, it, expect } from 'vitest'
import { extrapolate } from './resourceExtrapolator'

describe('extrapolate', () => {
  it('soma a taxa por hora ao longo do tempo', () => {
    const r = extrapolate({ matter: 100, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, 3_600_000)
    expect(r.matter).toBe(160)
  })
  it('cresce SEM teto — a parcela protegida não limita o acúmulo', () => {
    // base já acima da "capacidade" típica (ex.: 1000) e ainda subindo.
    const r = extrapolate({ matter: 990, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, 3_600_000)
    expect(r.matter).toBe(1050)
  })
  it('tempo negativo não regride', () => {
    const r = extrapolate({ matter: 100, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, -5000)
    expect(r.matter).toBe(100)
  })
})
