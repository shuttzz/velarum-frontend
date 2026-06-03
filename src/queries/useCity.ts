import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'
import { updateServerClock } from '../lib/serverClock'
import { queryKeys } from './keys'

// Estado do servidor da cidade. Faz polling a cada 5s (pega conclusão de construção / nova produção).
// Ancora o relógio do servidor (server_now) a cada resposta, corrigindo pelo RTT.
export function useCity(cityId: string | null) {
  return useQuery({
    queryKey: queryKeys.city(cityId ?? 'none'),
    queryFn: async () => {
      const t0 = performance.now()
      const c = await citiesApi.getCity(cityId as string)
      updateServerClock(new Date(c.server_now).getTime(), performance.now() - t0)
      return c
    },
    enabled: !!cityId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}
