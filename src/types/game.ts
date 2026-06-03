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

export type Troop = { unit_type: string; count: number }

export type RecruitQueued = { id: string; unit_type: string; count: number; finish_at: string }

export type March = {
  id: string
  province_id: string
  status: 'outbound' | 'returning' | 'done'
  attacker_won: boolean | null
  troops: Record<string, number>
  survivors: Record<string, number> | null
  arrive_at: string
  return_at: string | null
}

export type City = {
  id: string
  player_id: string
  name: string
  era: number
  coord_x: number
  coord_y: number
  resources: Amounts
  rate: Amounts
  capacity: Amounts
  grid_w: number
  grid_h: number
  buildings: Building[]
  pending: PendingBuild[]
  troops: Troop[]
  recruits: RecruitQueued[]
  army_cap: number
  marches: March[]
  server_now: string
}

export type Province = {
  id: string
  name_key: string
  q: number
  r: number
  ring: number
  def_attack: number
  def_hp: number
  reward: Amounts
  status: 'unconquered' | 'conquered'
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

export type CatalogUnit = {
  key: string
  name: string
  category: string
  attack: number
  defense: number
  hp: number
  cost: Amounts
  recruit_time: number
  era: number
}

export type Catalog = {
  growth: { production: number; cost: number; build_time: number }
  buildings: CatalogBuilding[]
  units: CatalogUnit[]
}
