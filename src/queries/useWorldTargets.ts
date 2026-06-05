import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'

// Alvos PvE do mundo COMPARTILHADO (nós de recurso — SW2). Poll ~5s para refletir ocupação/
// depleção/respawn dos nós enquanto o jogador olha o mapa. (Async puro; sem WebSocket.)
export function useWorldTargets(enabled: boolean) {
  return useQuery({
    queryKey: ['world-targets'],
    queryFn: () => citiesApi.getWorldTargets(),
    enabled,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}
