import { describe, it, expect } from 'vitest'
import type { Catalog, CatalogBuilding, CatalogUnit } from '../../types/game'
import { buildingEffectAtLevel } from './buildingEffect'

// t() stub: traduz só o que o helper usa (recursos + unidades); resto devolve a chave.
const t = (k: string) =>
  (({
    'resources.energy': 'Energia',
    'units.lanceiro': 'Lanceiro',
    'units.arqueiro': 'Arqueiro',
    'build.scoutSpeed': 'scout speed',
  }) as Record<string, string>)[k] ?? k

const bld = (key: string, extra: Partial<CatalogBuilding> = {}): CatalogBuilding => ({
  key,
  name: key,
  category: 'x',
  produces: '',
  base_rate: 0,
  base_cost: { matter: 0, energy: 0, knowledge: 0 },
  base_time: 0,
  max_copies: 1,
  era: 1,
  w: 1,
  h: 1,
  requires: [],
  ...extra,
})

const unit = (key: string, min: number): CatalogUnit => ({
  key,
  name: key,
  category: 'x',
  attack: 1,
  defense: 1,
  hp: 1,
  cost: { matter: 0, energy: 0, knowledge: 0 },
  recruit_time: 1,
  min_barracks_level: min,
  carry: 0,
  era: 1,
})

const catalog: Catalog = {
  growth: { production: 1.55, cost: 1.65, build_time: 1.8 },
  buildings: [
    bld('fogueira_comunal', { produces: 'energy', base_rate: 6 }),
    bld('celeiro_de_argila'),
    bld('torre_do_vigia'),
    bld('muralha'),
    bld('canteiro_de_almas'),
    bld('toca_dos_batedores'),
    bld('lar_do_cla'),
  ],
  units: [unit('lanceiro', 1), unit('arqueiro', 2)],
}

describe('buildingEffectAtLevel', () => {
  it('produção: floor(base_rate * growth^(nível-1))', () => {
    expect(buildingEffectAtLevel('fogueira_comunal', 1, catalog, t)).toBe('6 Energia/h')
    expect(buildingEffectAtLevel('fogueira_comunal', 2, catalog, t)).toBe('9 Energia/h') // floor(9.3)
    expect(buildingEffectAtLevel('fogueira_comunal', 3, catalog, t)).toBe('14 Energia/h') // floor(14.415)
  })

  it('celeiro: 500 + 300n + floor(50n²)', () => {
    expect(buildingEffectAtLevel('celeiro_de_argila', 1, catalog, t)).toBe('🔒 500')
    expect(buildingEffectAtLevel('celeiro_de_argila', 2, catalog, t)).toBe('🔒 850')
    expect(buildingEffectAtLevel('celeiro_de_argila', 3, catalog, t)).toBe('🔒 1300')
  })

  it('torre (30+20n) e muralha (200+150n)', () => {
    expect(buildingEffectAtLevel('torre_do_vigia', 1, catalog, t)).toBe('⚔ 30')
    expect(buildingEffectAtLevel('torre_do_vigia', 2, catalog, t)).toBe('⚔ 50')
    expect(buildingEffectAtLevel('muralha', 1, catalog, t)).toBe('♥ 200')
    expect(buildingEffectAtLevel('muralha', 2, catalog, t)).toBe('♥ 350')
  })

  it('canteiro: unidades desbloqueadas até o nível', () => {
    expect(buildingEffectAtLevel('canteiro_de_almas', 1, catalog, t)).toBe('Lanceiro')
    expect(buildingEffectAtLevel('canteiro_de_almas', 2, catalog, t)).toBe('Lanceiro, Arqueiro')
  })

  it('toca dos batedores: bônus de velocidade (+5%/nível acima do 1)', () => {
    expect(buildingEffectAtLevel('toca_dos_batedores', 1, catalog, t)).toBe('🔭 +0% scout speed')
    expect(buildingEffectAtLevel('toca_dos_batedores', 2, catalog, t)).toBe('🔭 +5% scout speed')
    expect(buildingEffectAtLevel('toca_dos_batedores', 3, catalog, t)).toBe('🔭 +10% scout speed')
  })

  it('sem efeito numérico (Lar) → null', () => {
    expect(buildingEffectAtLevel('lar_do_cla', 1, catalog, t)).toBeNull()
  })
})
