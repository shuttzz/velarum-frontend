import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'

// Cidades do mundo COMPARTILHADO (vizinhos no mapa). Poll RÁPIDO (~5s) para que cidades novas
// apareçam quase em tempo real enquanto o jogador olha o mapa, sem precisar sair/entrar. (Async
// puro; nada de WebSocket. Em escala, escopar por viewport.) refetchOnWindowFocus pega o retorno
// de aba na hora.
export function useWorldCities(enabled: boolean) {
  return useQuery({
    queryKey: ['world-cities'],
    queryFn: () => citiesApi.getWorldCities(),
    enabled,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}
