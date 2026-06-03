import type { Amounts, Catalog, CatalogBuilding, City } from '../../types/game'

// Helpers PUROS de catálogo: custo/tempo por nível, pré-requisitos e disponibilidade.
// Espelham as fórmulas do backend (config.CostFor / BuildTimeFor) usando as constantes
// de crescimento vindas do próprio catálogo — sem duplicar valores base no frontend.

// Custo de um edifício num dado nível (nível 1 = base). round bate com math.Round do Go.
export function costForLevel(base: Amounts, growth: number, level: number): Amounts {
  const f = Math.pow(growth, level - 1)
  return {
    matter: Math.round(base.matter * f),
    energy: Math.round(base.energy * f),
    knowledge: Math.round(base.knowledge * f),
  }
}

// Tempo de construção/upgrade (segundos) num dado nível.
export function buildSecondsForLevel(base: number, growth: number, level: number): number {
  return base * Math.pow(growth, level - 1)
}

// Quantas cópias deste tipo já existem (construídas + na fila de construção, não upgrades).
export function copiesUsed(city: City, key: string): number {
  const built = city.buildings.filter((b) => b.type === key).length
  const queued = city.pending.filter((p) => p.building_type === key && !p.is_upgrade).length
  return built + queued
}

// Maior nível já construído de um tipo de edifício (0 se não há nenhum).
export function maxLevelOf(city: City, key: string): number {
  return city.buildings.reduce((m, b) => (b.type === key && b.level > m ? b.level : m), 0)
}

// Pré-requisitos atendidos? (espelha config.checkPrereqs — exige edifícios construídos).
export function prereqsMet(city: City, b: CatalogBuilding): boolean {
  return b.requires.every((r) => maxLevelOf(city, r.building_key) >= r.level)
}

// A cidade tem recursos suficientes para pagar `cost`?
export function canAfford(res: Amounts, cost: Amounts): boolean {
  return res.matter >= cost.matter && res.energy >= cost.energy && res.knowledge >= cost.knowledge
}

// maxAffordable: quantas unidades de `cost` dá pra pagar com `res` (mínimo entre os recursos
// com custo > 0). Se o custo é todo zero, retorna Infinity.
export function maxAffordable(res: Amounts, cost: Amounts): number {
  let max = Infinity
  if (cost.matter > 0) max = Math.min(max, Math.floor(res.matter / cost.matter))
  if (cost.energy > 0) max = Math.min(max, Math.floor(res.energy / cost.energy))
  if (cost.knowledge > 0) max = Math.min(max, Math.floor(res.knowledge / cost.knowledge))
  return max
}

// Nome amigável de um edifício a partir do catálogo (fallback: a própria key).
export function buildingName(catalog: Catalog, key: string): string {
  return catalog.buildings.find((b) => b.key === key)?.name ?? key
}

// Formata uma duração em segundos como "30s", "2m30s", "1h0m".
export function formatDuration(secs: number): string {
  const s = Math.round(secs)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return rs ? `${m}m${rs}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h${m % 60}m`
}
