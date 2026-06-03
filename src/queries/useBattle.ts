import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { citiesApi } from '../api/cities'
import type { BattleHex, BattleView } from '../types/game'
import { queryKeys } from './keys'

// Estado da batalha tática. Sem polling: o estado só muda por ação do jogador (que já
// atualiza o cache via mutation). Habilitado só quando há uma batalha aberta.
export function useBattle(cityId: string, battleId: string | null) {
  return useQuery({
    queryKey: queryKeys.battle(cityId, battleId ?? 'none'),
    queryFn: () => citiesApi.getBattle(cityId, battleId as string),
    enabled: !!battleId,
  })
}

// Ações da batalha: agir (mover/atacar) e encerrar turno. Cada resposta traz o estado novo,
// que escrevemos direto no cache. Ao resolver, invalida cidade+províncias (guarnição/conquista).
export function useBattleActions(cityId: string, battleId: string | null) {
  const qc = useQueryClient()

  const onResult = (view: BattleView) => {
    qc.setQueryData(queryKeys.battle(cityId, view.id), view)
    if (view.status === 'resolved') {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.reports(cityId) })
    }
  }

  const act = useMutation({
    mutationFn: (body: { unit_id: string; move_to?: BattleHex; target_id?: string }) =>
      citiesApi.battleAct(cityId, battleId as string, body),
    onSuccess: onResult,
  })

  const endTurn = useMutation({
    mutationFn: () => citiesApi.battleEndTurn(cityId, battleId as string),
    onSuccess: onResult,
  })

  return { act, endTurn }
}
