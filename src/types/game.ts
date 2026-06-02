export type Amounts = { matter: number; energy: number; knowledge: number }

export type Building = {
  id: string
  type: string
  level: number
  x: number
  y: number
  w: number
  h: number
}

export type PendingBuild = {
  id: string
  building_type: string
  target_level: number
  x: number
  y: number
  is_upgrade: boolean
  finish_at: string
}

export type City = {
  id: string
  player_id: string
  name: string
  era: number
  resources: Amounts
  rate: Amounts
  capacity: Amounts
  grid_w: number
  grid_h: number
  buildings: Building[]
  pending: PendingBuild[]
  server_now: string
}

export type BuildQueued = {
  id: string
  building_type: string
  target_level: number
  x: number
  y: number
  finish_at: string
}

export type Requirement = { building_key: string; level: number }

export type CatalogBuilding = {
  key: string
  name: string
  category: string
  produces: string
  base_rate: number
  base_cost: Amounts
  base_time: number
  max_copies: number
  era: number
  w: number
  h: number
  requires: Requirement[]
}

export type Catalog = {
  growth: { production: number; cost: number; build_time: number }
  buildings: CatalogBuilding[]
}
