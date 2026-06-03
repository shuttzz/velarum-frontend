import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi } from '../api/games'
import { citiesApi } from '../api/cities'
import type { Catalog, City, PendingBuild } from '../types/game'
import { costForLevel, buildSecondsForLevel } from '../features/city/catalog'
import { serverNow } from '../lib/serverClock'
import { queryKeys } from './keys'

// Cria um novo jogo (mundo + jogador + cidade inicial).
export function useCreateGame() {
  return useMutation({ mutationFn: () => gamesApi.createGame() })
}

// Ações sobre os edifícios da cidade. Upgrade e cancelar usam ATUALIZAÇÃO OTIMISTA: a UI
// reflete a ação na hora do clique (sem esperar o round-trip) e reconcilia no refetch.
export function useCityActions(cityId: string) {
  const qc = useQueryClient()
  const key = queryKeys.city(cityId)
  const invalidate = () => qc.invalidateQueries({ queryKey: key })
  const rollback = (_e: unknown, _v: unknown, ctx: { prev?: City } | undefined) => {
    if (ctx?.prev) qc.setQueryData(key, ctx.prev)
  }

  const construct = useMutation({
    mutationFn: (p: { building_type: string; x: number; y: number }) => citiesApi.construct(cityId, p),
    onSuccess: invalidate,
  })

  const upgrade = useMutation({
    mutationFn: (buildingId: string) => citiesApi.upgrade(cityId, buildingId),
    onMutate: async (buildingId: string) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<City>(key)
      const catalog = qc.getQueryData<Catalog>(queryKeys.catalog)
      if (prev && catalog) {
        const b = prev.buildings.find((x) => x.id === buildingId)
        const def = b ? catalog.buildings.find((d) => d.key === b.type) : undefined
        const busy = b ? prev.pending.some((p) => p.is_upgrade && p.x === b.x && p.y === b.y) : true
        if (b && def && !busy) {
          const target = b.level + 1
          const cost = costForLevel(def.base_cost, catalog.growth.cost, target)
          const secs = buildSecondsForLevel(def.base_time, catalog.growth.build_time, target)
          const pending: PendingBuild = {
            id: `optimistic-${buildingId}`,
            building_type: b.type,
            target_level: target,
            x: b.x,
            y: b.y,
            is_upgrade: true,
            finish_at: new Date(serverNow() + secs * 1000).toISOString(),
          }
          qc.setQueryData<City>(key, {
            ...prev,
            pending: [...prev.pending, pending],
            resources: {
              matter: prev.resources.matter - cost.matter,
              energy: prev.resources.energy - cost.energy,
              knowledge: prev.resources.knowledge - cost.knowledge,
            },
          })
        }
      }
      return { prev }
    },
    onError: rollback,
    onSettled: invalidate,
  })

  const move = useMutation({
    mutationFn: (p: { buildingId: string; x: number; y: number }) =>
      citiesApi.move(cityId, p.buildingId, { x: p.x, y: p.y }),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (buildId: string) => citiesApi.cancelBuild(cityId, buildId),
    onMutate: async (buildId: string) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<City>(key)
      const catalog = qc.getQueryData<Catalog>(queryKeys.catalog)
      if (prev) {
        const p = prev.pending.find((x) => x.id === buildId)
        let resources = prev.resources
        const def = p && catalog ? catalog.buildings.find((d) => d.key === p.building_type) : undefined
        if (p && def && catalog) {
          const refund = costForLevel(def.base_cost, catalog.growth.cost, p.target_level)
          resources = {
            matter: prev.resources.matter + refund.matter,
            energy: prev.resources.energy + refund.energy,
            knowledge: prev.resources.knowledge + refund.knowledge,
          }
        }
        qc.setQueryData<City>(key, { ...prev, pending: prev.pending.filter((x) => x.id !== buildId), resources })
      }
      return { prev }
    },
    onError: rollback,
    onSettled: invalidate,
  })

  return { construct, upgrade, move, cancel }
}

// Ações militares: recrutar (cidade) e marchar (mapa). Marchar afeta cidade + províncias.
export function useArmyActions(cityId: string) {
  const qc = useQueryClient()

  const recruit = useMutation({
    mutationFn: (p: { unit_type: string; count: number }) => citiesApi.recruit(cityId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.city(cityId) }),
  })
  const march = useMutation({
    mutationFn: (p: { province_id: string; troops: Record<string, number> }) => citiesApi.march(cityId, p),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
    },
  })
  // Batalha tática: inicia a batalha (debita a guarnição no servidor) contra a província. A
  // resposta traz a BattleView; o chamador abre o overlay com view.id.
  const startBattle = useMutation({
    mutationFn: (p: { province_id: string; troops: Record<string, number> }) =>
      citiesApi.startBattle(cityId, p.province_id, p.troops),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.city(cityId) })
      void qc.invalidateQueries({ queryKey: queryKeys.provinces(cityId) })
    },
  })
  // Cancelar recrutamento: otimista — remove da fila e devolve o custo (custo unitário × count).
  const cancelRecruit = useMutation<void, unknown, string, { prev?: City }>({
    mutationFn: (recruitId) => citiesApi.cancelRecruit(cityId, recruitId),
    onMutate: async (recruitId) => {
      await qc.cancelQueries({ queryKey: queryKeys.city(cityId) })
      const prev = qc.getQueryData<City>(queryKeys.city(cityId))
      const catalog = qc.getQueryData<Catalog>(queryKeys.catalog)
      if (prev) {
        const r = prev.recruits.find((x) => x.id === recruitId)
        let resources = prev.resources
        const u = r && catalog ? catalog.units.find((d) => d.key === r.unit_type) : undefined
        if (r && u) {
          resources = {
            matter: prev.resources.matter + u.cost.matter * r.count,
            energy: prev.resources.energy + u.cost.energy * r.count,
            knowledge: prev.resources.knowledge + u.cost.knowledge * r.count,
          }
        }
        qc.setQueryData<City>(queryKeys.city(cityId), { ...prev, recruits: prev.recruits.filter((x) => x.id !== recruitId), resources })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.city(cityId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.city(cityId) }),
  })

  return { recruit, march, startBattle, cancelRecruit }
}
