import { describe, it, expect } from 'vitest'
import type { Catalog, CatalogBuilding, City } from '../../types/game'
import {
  buildSecondsForLevel,
  buildingName,
  canAfford,
  copiesUsed,
  costForLevel,
  formatDuration,
  maxLevelOf,
  prereqsMet,
} from './catalog'

const fogueira: CatalogBuilding = {
  key: 'fogueira_comunal',
  name: 'Fogueira Comunal',
  category: 'production',
  produces: 'energy',
  base_rate: 6,
  base_cost: { matter: 50, energy: 30, knowledge: 10 },
  base_time: 45,
  max_copies: 3,
  era: 1,
  w: 1,
  h: 1,
  requires: [{ building_key: 'lar_do_cla', level: 2 }],
}

const catalog: Catalog = {
  growth: { production: 1.55, cost: 1.65, build_time: 1.8 },
  buildings: [
    { ...fogueira, key: 'lar_do_cla', name: 'Lar do Clã', requires: [] },
    fogueira,
  ],
  units: [],
}

function city(partial: Partial<City>): City {
  return {
    id: 'c1',
    player_id: 'p1',
    name: 'Capital',
    era: 1,
    resources: { matter: 0, energy: 0, knowledge: 0 },
    rate: { matter: 0, energy: 0, knowledge: 0 },
    capacity: { matter: 500, energy: 500, knowledge: 200 },
    coord_x: 0,
    coord_y: 0,
    grid_w: 8,
    grid_h: 6,
    buildings: [],
    pending: [],
    troops: [],
    recruits: [],
    army_cap: 0,
    marches: [],
    world_marches: [],
    raids: [],
    incoming: [],
    scouts: 0,
    scouts_training: [],
    scout_missions: [],
    active_battle_id: '',
    server_now: '2026-06-02T00:00:00Z',
    ...partial,
  }
}

describe('costForLevel', () => {
  it('nível 1 = custo base', () => {
    expect(costForLevel(fogueira.base_cost, 1.65, 1)).toEqual({ matter: 50, energy: 30, knowledge: 10 })
  })
  it('nível 2 aplica crescimento e arredonda como o backend (round)', () => {
    // 50*1.65=82.5→83 ; 30*1.65=49.5→50 ; 10*1.65=16.5→17
    expect(costForLevel(fogueira.base_cost, 1.65, 2)).toEqual({ matter: 83, energy: 50, knowledge: 17 })
  })
})

describe('buildSecondsForLevel', () => {
  it('nível 1 = tempo base; nível 2 multiplica pelo crescimento', () => {
    expect(buildSecondsForLevel(45, 1.8, 1)).toBe(45)
    expect(buildSecondsForLevel(45, 1.8, 2)).toBeCloseTo(81)
  })
})

describe('copiesUsed', () => {
  it('soma construídos + na fila (ignora upgrades)', () => {
    const c = city({
      buildings: [{ id: 'b1', type: 'fogueira_comunal', level: 1, x: 0, y: 0, w: 1, h: 1 }],
      pending: [
        { id: 'p1', building_type: 'fogueira_comunal', target_level: 1, x: 1, y: 0, is_upgrade: false, finish_at: '' },
        { id: 'p2', building_type: 'fogueira_comunal', target_level: 2, x: 0, y: 0, is_upgrade: true, finish_at: '' },
      ],
    })
    expect(copiesUsed(c, 'fogueira_comunal')).toBe(2)
  })
})

describe('prereqsMet', () => {
  it('falso quando o pré-requisito não está no nível exigido', () => {
    const c = city({ buildings: [{ id: 'b1', type: 'lar_do_cla', level: 1, x: 0, y: 0, w: 1, h: 1 }] })
    expect(prereqsMet(c, fogueira)).toBe(false)
  })
  it('verdadeiro quando o pré-requisito atinge o nível', () => {
    const c = city({ buildings: [{ id: 'b1', type: 'lar_do_cla', level: 2, x: 0, y: 0, w: 1, h: 1 }] })
    expect(prereqsMet(c, fogueira)).toBe(true)
  })
})

describe('maxLevelOf / canAfford / buildingName / formatDuration', () => {
  it('maxLevelOf pega o maior nível do tipo', () => {
    const c = city({
      buildings: [
        { id: 'b1', type: 'viveiro_de_pedra', level: 1, x: 0, y: 0, w: 1, h: 1 },
        { id: 'b2', type: 'viveiro_de_pedra', level: 3, x: 1, y: 0, w: 1, h: 1 },
      ],
    })
    expect(maxLevelOf(c, 'viveiro_de_pedra')).toBe(3)
    expect(maxLevelOf(c, 'inexistente')).toBe(0)
  })
  it('canAfford compara os 3 recursos', () => {
    expect(canAfford({ matter: 50, energy: 30, knowledge: 10 }, fogueira.base_cost)).toBe(true)
    expect(canAfford({ matter: 49, energy: 30, knowledge: 10 }, fogueira.base_cost)).toBe(false)
  })
  it('buildingName resolve pelo catálogo com fallback na key', () => {
    expect(buildingName(catalog, 'lar_do_cla')).toBe('Lar do Clã')
    expect(buildingName(catalog, 'desconhecido')).toBe('desconhecido')
  })
  it('formatDuration formata segundos/minutos/horas', () => {
    expect(formatDuration(30)).toBe('30s')
    expect(formatDuration(90)).toBe('1m30s')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(3600)).toBe('1h0m')
  })
})
