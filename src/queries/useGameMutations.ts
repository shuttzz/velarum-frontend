import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { citiesApi } from '../api/cities'
import { queryKeys } from './keys'

// Cria um novo jogo (mundo + jogador + cidade inicial).
export function useCreateGame() {
  return useMutation({ mutationFn: () => gamesApi.createGame() })
}

// Ações sobre os edifícios da cidade; cada sucesso invalida a query da cidade.
export function useCityActions(cityId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })

  const construct = useMutation({
    mutationFn: (p: { building_type: string; x: number; y: number }) => citiesApi.construct(cityId, p),
    onSuccess: invalidate,
  })
  const upgrade = useMutation({
    mutationFn: (buildingId: string) => citiesApi.upgrade(cityId, buildingId),
    onSuccess: invalidate,
  })
  const move = useMutation({
    mutationFn: (p: { buildingId: string; x: number; y: number }) =>
      citiesApi.move(cityId, p.buildingId, { x: p.x, y: p.y }),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (buildId: string) => citiesApi.cancelBuild(cityId, buildId),
    onSuccess: invalidate,
  })

  return { construct, upgrade, move, cancel }
}

// Ações militares: recrutar (cidade) e marchar (mapa). Marchar afeta cidade + províncias.
export function useArmyActions(cityId: string) {
  const qc = useQueryClient()

  const recruit = useMutation({
    mutationFn: (p: { unit_type: string; count: number }) => citiesApi.recruit(cityId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.city(cityId) }),
  })
  const march = useMutation({
    mutationFn: (p: { province_id: string; troops: Record<string, number> }) => citiesApi.march(cityId, p),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
    },
  })

  return { recruit, march }
}
