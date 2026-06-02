import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BuildPalette } from './BuildPalette'
import { useGameUIStore } from '../../../stores/useGameUIStore'

beforeEach(() => {
  useGameUIStore.setState({ selectedBuildingId: null, buildMode: { type: 'idle' } })
})

describe('BuildPalette', () => {
  it('clicar num edifício entra em modo de construção (placing)', () => {
    render(<BuildPalette />)
    fireEvent.click(screen.getByText('Viveiro de Pedra'))
    expect(useGameUIStore.getState().buildMode).toEqual({ type: 'placing', buildingType: 'viveiro_de_pedra' })
  })

  it('mostra a dica de clicar numa célula quando em placing', () => {
    render(<BuildPalette />)
    fireEvent.click(screen.getByText('Celeiro de Argila'))
    expect(screen.getByText(/Clique numa célula vazia/)).toBeInTheDocument()
  })
})
