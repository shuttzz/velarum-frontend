import type { Catalog } from '../../types/game'

// Efeito de um edifício num dado NÍVEL, já formatado para exibição. Usado para mostrar
// "nível atual dá X → próximo nível dá Y" no modal do edifício.
// Espelha as fórmulas do backend (config): ProductionPerHour + StorageCapFor (gameconfig.go);
// TowerAttack + WallHP (defense.go). Retorna null para edifícios sem efeito por-nível
// computável (ex.: Lar/Toca) — nesse caso a UI cai no texto genérico de upgrade.
type T = (key: string, opts?: Record<string, unknown>) => string

export function buildingEffectAtLevel(key: string, level: number, catalog: Catalog, t: T): string | null {
  if (level < 1) return null
  const def = catalog.buildings.find((b) => b.key === key)

  // Produção (Viveiro/Fogueira/Pedra): floor(base_rate * growth^(nível-1)).
  if (def && def.base_rate > 0 && def.produces) {
    const rate = Math.floor(def.base_rate * Math.pow(catalog.growth.production, level - 1))
    return `${rate} ${t(`resources.${def.produces}`)}/h`
  }

  switch (key) {
    case 'celeiro_de_argila': {
      // StorageCapFor: 500 + (n)*300 + floor(n²*50), n = nível-1.
      const n = level - 1
      const cap = 500 + n * 300 + Math.floor(n * n * 50)
      return `🔒 ${cap}`
    }
    case 'torre_do_vigia':
      return `⚔ ${30 + 20 * (level - 1)}` // TowerAttack
    case 'muralha':
      return `♥ ${200 + 150 * (level - 1)}` // WallHP
    case 'canteiro_de_almas': {
      // Unidades desbloqueadas até este nível do Canteiro (min_barracks_level).
      const units = catalog.units.filter((u) => u.min_barracks_level <= level).map((u) => t(`units.${u.key}`))
      return units.length ? units.join(', ') : '—'
    }
    default:
      return null // Lar/Toca etc.: sem efeito numérico por nível → texto genérico.
  }
}
