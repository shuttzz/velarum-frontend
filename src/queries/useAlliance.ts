import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alliancesApi } from '../api/alliances'
import { queryKeys } from './keys'

// A minha aliança (404/not_in_alliance se não tenho — o componente trata como "sem aliança").
export function useMyAlliance(enabled: boolean) {
  return useQuery({
    queryKey: ['alliance', 'mine'],
    queryFn: () => alliancesApi.mine(),
    enabled,
    retry: false,
    refetchInterval: 8000,
  })
}

// Lista de alianças do mundo (para navegar/entrar).
export function useAlliances(enabled: boolean) {
  return useQuery({ queryKey: ['alliance', 'list'], queryFn: () => alliancesApi.list(), enabled })
}

export function useAllianceActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['alliance'] })
    void qc.invalidateQueries({ queryKey: queryKeys.me }) // premium mudou (criar custa)
  }
  return {
    create: useMutation({ mutationFn: (p: { name: string; tag: string }) => alliancesApi.create(p), onSuccess: invalidate }),
    join: useMutation({ mutationFn: (id: string) => alliancesApi.join(id), onSuccess: invalidate }),
    decide: useMutation({ mutationFn: (p: { requestId: string; approve: boolean }) => alliancesApi.decide(p.requestId, p.approve), onSuccess: invalidate }),
    leave: useMutation({ mutationFn: () => alliancesApi.leave(), onSuccess: invalidate }),
    kick: useMutation({ mutationFn: (playerId: string) => alliancesApi.kick(playerId), onSuccess: invalidate }),
    setEntryMode: useMutation({ mutationFn: (mode: 'open' | 'approval') => alliancesApi.setEntryMode(mode), onSuccess: invalidate }),
    setRole: useMutation({ mutationFn: (p: { playerId: string; role: string }) => alliancesApi.setRole(p.playerId, p.role), onSuccess: invalidate }),
    transfer: useMutation({ mutationFn: (playerId: string) => alliancesApi.transfer(playerId), onSuccess: invalidate }),
    disband: useMutation({ mutationFn: () => alliancesApi.disband(), onSuccess: invalidate }),
  }
}
