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

  return { construct, upgrade, move }
}
