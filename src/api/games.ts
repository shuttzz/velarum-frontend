import { api } from './client'
import type { City } from '../types/game'

export const gamesApi = {
  createGame: (body: { faction?: string; city_name?: string } = {}) => api.post<City>('/games', body),
}
