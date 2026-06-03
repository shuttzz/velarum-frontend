import { api } from './client'
import type { BuildQueued, City, March, Province, Report } from '../types/game'

export const citiesApi = {
  getCity: (cityId: string) => api.get<City>(`/cities/${cityId}`),

  construct: (cityId: string, body: { building_type: string; x: number; y: number }) =>
    api.post<BuildQueued>(`/cities/${cityId}/buildings`, body),

  upgrade: (cityId: string, buildingId: string) =>
    api.post<BuildQueued>(`/cities/${cityId}/buildings/${buildingId}/upgrade`, {}),

  move: (cityId: string, buildingId: string, body: { x: number; y: number }) =>
    api.postVoid(`/cities/${cityId}/buildings/${buildingId}/move`, body),

  cancelBuild: (cityId: string, buildId: string) =>
    api.postVoid(`/cities/${cityId}/builds/${buildId}/cancel`, {}),

  recruit: (cityId: string, body: { unit_type: string; count: number }) =>
    api.post<{ id: string }>(`/cities/${cityId}/recruit`, body),

  getProvinces: (cityId: string) => api.get<Province[]>(`/cities/${cityId}/provinces`),

  march: (cityId: string, body: { province_id: string; troops: Record<string, number> }) =>
    api.post<March>(`/cities/${cityId}/march`, body),

  getReports: (cityId: string) => api.get<Report[]>(`/cities/${cityId}/reports`),

  markReportsRead: (cityId: string) => api.postVoid(`/cities/${cityId}/reports/read`, {}),
}
