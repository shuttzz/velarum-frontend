import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCity } from './useCity'
import { serverNow } from '../lib/serverClock'
import { queryKeys } from './keys'

// Buffer (ms) após o finish_at para cobrir a latência do scheduler do backend (tick ~250ms).
const SCHEDULER_BUFFER_MS = 600
// Quando algo JÁ passou do horário mas ainda aparece pendente (scheduler do backend atrasado por
// jitter/carga), refazemos o fetch nesse intervalo curto até concluir — em vez de cair no poll de
// 5s (que faz a conclusão "demorar uns segundos" depois do contador zerar).
const NUDGE_MS = 400

// useCompletionRefetch agenda um refetch da cidade (e províncias/relatórios) para o instante
// em que a PRÓXIMA tarefa conclui (obra, recrutamento, chegada/volta de marcha), em vez de
// esperar o polling de 5s. Mantém o contador visual em sincronia com o que o servidor faz.
export function useCompletionRefetch(cityId: string | null) {
  const qc = useQueryClient()
  const { data: city } = useCity(cityId)

  // Ao voltar o foco da aba (pós-sleep/hibernação), ressincroniza: refetch reancorará o relógio.
  useEffect(() => {
    if (!cityId) return
    const onVis = () => {
      if (document.visibilityState === 'visible') void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [cityId, qc])

  useEffect(() => {
    if (!cityId || !city) return
    const now = serverNow()
    // Horário da PRÓXIMA transição de cada trabalho ATIVO (obra, recruta, marcha de província,
    // marcha de nó). LoadCity só devolve marchas ativas; usamos o horário da fase atual.
    const times: number[] = []
    for (const p of city.pending) times.push(new Date(p.finish_at).getTime())
    for (const r of city.recruits) times.push(new Date(r.finish_at).getTime())
    for (const m of city.marches) {
      if (m.status === 'outbound') times.push(new Date(m.arrive_at).getTime())
      else if (m.status === 'returning' && m.return_at) times.push(new Date(m.return_at).getTime())
    }
    for (const m of city.world_marches ?? []) {
      if (m.status === 'outbound') times.push(new Date(m.arrive_at).getTime())
      else if (m.status === 'collecting' && m.collect_until) times.push(new Date(m.collect_until).getTime())
      else if (m.status === 'returning' && m.return_at) times.push(new Date(m.return_at).getTime())
    }
    if (times.length === 0) return

    const future = times.filter((t) => t > now)
    const overdue = times.some((t) => t <= now) // já deveria ter concluído mas ainda está na lista
    // Se algo está atrasado, cutuca logo (até o backend concluir); senão, agenda para a próxima.
    const delay = overdue ? NUDGE_MS : Math.min(...future) - now + SCHEDULER_BUFFER_MS
    const id = setTimeout(() => {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.reports(cityId) })
    }, Math.max(delay, 0))
    return () => clearTimeout(id)
  }, [cityId, city, qc])
}
