import { describe, it, expect } from 'vitest'
import { extrapolate } from './resourceExtrapolator'

const cap = { matter: 1000, energy: 1000, knowledge: 1000 }

describe('extrapolate', () => {
  it('soma a taxa por hora ao longo do tempo', () => {
    const r = extrapolate({ matter: 100, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, cap, 3_600_000)
    expect(r.matter).toBe(160)
  })
  it('respeita o teto de capacidade', () => {
    const r = extrapolate({ matter: 990, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, cap, 3_600_000)
    expect(r.matter).toBe(1000)
  })
  it('tempo negativo não regride', () => {
    const r = extrapolate({ matter: 100, energy: 0, knowledge: 0 }, { matter: 60, energy: 0, knowledge: 0 }, cap, -5000)
    expect(r.matter).toBe(100)
  })
})
