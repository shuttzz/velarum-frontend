import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCity } from './useCity'
import { serverNow } from '../lib/serverClock'
import { queryKeys } from './keys'

// Buffer (ms) após o finish_at para cobrir a latência do scheduler do backend (tick ~250ms).
const SCHEDULER_BUFFER_MS = 600

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
    const times: number[] = []
    for (const p of city.pending) times.push(new Date(p.finish_at).getTime())
    for (const r of city.recruits) times.push(new Date(r.finish_at).getTime())
    for (const m of city.marches) {
      times.push(new Date(m.arrive_at).getTime())
      if (m.return_at) times.push(new Date(m.return_at).getTime())
    }
    const future = times.filter((t) => t > now)
    if (future.length === 0) return

    const delay = Math.min(...future) - now + SCHEDULER_BUFFER_MS
    const id = setTimeout(() => {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.reports(cityId) })
    }, Math.max(delay, 0))
    return () => clearTimeout(id)
  }, [cityId, city, qc])
}
