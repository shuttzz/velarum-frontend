import { useQuery } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { updateServerClock } from '../lib/serverClock'

// Entra no mundo (cria a cidade na 1ª vez, retorna a existente depois) como QUERY: roda
// automaticamente ao montar e é segura sob StrictMode — sem o footgun dos callbacks de
// mutation, que o react-query descarta se o componente desmontar antes da resposta.
// EnterWorld é idempotente no backend, então tratar como leitura é seguro.
export function useEnterWorld() {
  return useQuery({
    queryKey: ['enter-world'],
    queryFn: async () => {
      const t0 = performance.now()
      const c = await gamesApi.createGame()
      updateServerClock(new Date(c.server_now).getTime(), performance.now() - t0)
      return c
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
