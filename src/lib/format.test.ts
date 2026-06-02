import { describe, it, expect } from 'vitest'
import { formatAmount } from './format'

describe('formatAmount', () => {
  it('formata inteiros no padrão pt-BR (separador de milhar)', () => {
    expect(formatAmount(1234.9)).toBe('1.234')
  })
  it('trunca a parte fracionária', () => {
    expect(formatAmount(99.99)).toBe('99')
  })
})
