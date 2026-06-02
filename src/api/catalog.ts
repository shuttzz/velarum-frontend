import { api } from './client'
import type { Catalog } from '../types/game'

// Catálogo de edifícios (estático no servidor): nome, custo/tempo base e pré-requisitos.
export const catalogApi = {
  getCatalog: () => api.get<Catalog>('/catalog'),
}
