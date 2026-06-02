import { api } from './client'
import type { BuildQueued, City } from '../types/game'

export const citiesApi = {
  getCity: (cityId: string) => api.get<City>(`/cities/${cityId}`),

  construct: (cityId: string, body: { building_type: string; x: number; y: number }) =>
    api.post<BuildQueued>(`/cities/${cityId}/buildings`, body),

  upgrade: (cityId: string, buildingId: string) =>
    api.post<BuildQueued>(`/cities/${cityId}/buildings/${buildingId}/upgrade`, {}),

  move: (cityId: string, buildingId: string, body: { x: number; y: number }) =>
    api.postVoid(`/cities/${cityId}/buildings/${buildingId}/move`, body),
}
