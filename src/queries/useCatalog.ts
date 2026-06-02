import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/catalog'
import { queryKeys } from './keys'

// Catálogo de edifícios. É estático no servidor → busca uma vez e mantém em cache.
export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: () => catalogApi.getCatalog(),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
