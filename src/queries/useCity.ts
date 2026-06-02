import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'
import { queryKeys } from './keys'

// Estado do servidor da cidade. Faz polling a cada 5s (pega conclusão de construção / nova produção).
export function useCity(cityId: string | null) {
  return useQuery({
    queryKey: queryKeys.city(cityId ?? 'none'),
    queryFn: () => citiesApi.getCity(cityId as string),
    enabled: !!cityId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}
