import { api } from './client'
import type { BattleHex, BattleView, BuildQueued, City, March, Province, Raid, Report, ScoutMission, ScoutQueued, WorldCity, WorldMarch, WorldTarget } from '../types/game'

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

  cancelRecruit: (cityId: string, recruitId: string) =>
    api.postVoid(`/cities/${cityId}/recruits/${recruitId}/cancel`, {}),

  getWorldCities: () => api.get<WorldCity[]>(`/world/cities`),

  getWorldTargets: () => api.get<WorldTarget[]>(`/world/targets`),

  collect: (cityId: string, body: { target_id: string; troops: Record<string, number> }) =>
    api.post<WorldMarch>(`/cities/${cityId}/collect`, body),

  raid: (cityId: string, body: { target_city_id: string; troops: Record<string, number> }) =>
    api.post<Raid>(`/cities/${cityId}/raid`, body),

  trainScouts: (cityId: string, body: { count: number }) =>
    api.post<ScoutQueued>(`/cities/${cityId}/train-scouts`, body),

  sendScout: (cityId: string, body: { target_city_id: string }) =>
    api.post<ScoutMission>(`/cities/${cityId}/scout`, body),

  getProvinces: (cityId: string) => api.get<Province[]>(`/cities/${cityId}/provinces`),

  march: (cityId: string, body: { province_id: string; troops: Record<string, number> }) =>
    api.post<March>(`/cities/${cityId}/march`, body),

  getReports: (cityId: string) => api.get<Report[]>(`/cities/${cityId}/reports`),

  markReportsRead: (cityId: string) => api.postVoid(`/cities/${cityId}/reports/read`, {}),

  // Batalha tática: inicia (instanciada contra a província), consulta e age (mover/atacar/encerrar turno).
  startBattle: (cityId: string, provinceId: string, troops: Record<string, number>) =>
    api.post<BattleView>(`/cities/${cityId}/provinces/${provinceId}/battle`, { troops }),

  getBattle: (cityId: string, battleId: string) =>
    api.get<BattleView>(`/cities/${cityId}/battles/${battleId}`),

  battleAct: (cityId: string, battleId: string, body: { unit_id: string; move_to?: BattleHex; target_id?: string }) =>
    api.post<BattleView>(`/cities/${cityId}/battles/${battleId}/act`, body),

  battleEndTurn: (cityId: string, battleId: string) =>
    api.post<BattleView>(`/cities/${cityId}/battles/${battleId}/end-turn`, {}),
}
