import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'
import { queryKeys } from './keys'

// Relatórios (caixa de entrada). Polling leve para captar novos relatórios de batalha.
export function useReports(cityId: string | null) {
  return useQuery({
    queryKey: queryKeys.reports(cityId ?? 'none'),
    queryFn: () => citiesApi.getReports(cityId as string),
    enabled: !!cityId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}

// Marca todos os relatórios como lidos.
export function useMarkReportsRead(cityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => citiesApi.markReportsRead(cityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reports(cityId) }),
  })
}
