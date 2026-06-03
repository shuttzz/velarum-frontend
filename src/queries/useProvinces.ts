import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'
import { queryKeys } from './keys'

// Províncias PvE do jogador (geradas no backend na 1ª chamada). Polling leve para refletir
// conquistas/marcha; alinhado ao polling da cidade.
export function useProvinces(cityId: string | null) {
  return useQuery({
    queryKey: queryKeys.provinces(cityId ?? 'none'),
    queryFn: () => citiesApi.getProvinces(cityId as string),
    enabled: !!cityId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}
