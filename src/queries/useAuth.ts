import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { queryKeys } from './keys'

// Conta autenticada. 401 (sem sessão) NÃO é re-tentado e é tratado como "deslogado".
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => authApi.me(),
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 1,
    staleTime: 60_000,
  })
}

export function useAuthActions() {
  const qc = useQueryClient()
  const refreshMe = () => qc.invalidateQueries({ queryKey: queryKeys.me })

  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) => authApi.login(body),
    onSuccess: (acc) => {
      qc.setQueryData(queryKeys.me, acc)
      void refreshMe()
    },
  })
  const register = useMutation({
    mutationFn: (body: { username: string; email: string; password: string }) => authApi.register(body),
    onSuccess: (acc) => {
      qc.setQueryData(queryKeys.me, acc)
      void refreshMe()
    },
  })
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(queryKeys.me, null)
      qc.clear()
    },
  })

  return { login, register, logout }
}
