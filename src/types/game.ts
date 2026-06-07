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

// Alvo PvE do mundo COMPARTILHADO (SW2). 'node' = nó de recurso (coleta); 'village'/'creature' =
// alvo de combate one-shot (ataque → loot → consumido).
export type WorldTargetKind = 'node' | 'village' | 'creature'
export type WorldTarget = {
  id: string
  kind: WorldTargetKind
  resource: 'matter' | 'energy' | 'knowledge'
  level: number
  coord_x: number
  coord_y: number
  amount_total: number
  amount_remaining: number
  def_attack: number // combate: defesa agregada
  def_hp: number
  reward: Amounts // combate: loot ao matar
  expires_at: string | null // combate: quando despawna (TTL); null p/ nó
  status: 'idle' | 'occupied' | 'depleted'
}

// Marcha a um alvo do mundo (ida → coleta/combate → volta com loot).
export type WorldMarch = {
  id: string
  target_id: string
  status: 'outbound' | 'collecting' | 'returning' | 'done'
  troops: Record<string, number>
  survivors: Record<string, number> | null // tropas que voltam (pós-combate em raid)
  loot: Amounts
  attacker_won: boolean | null // raid: venceu? null = marcha de coleta (nó)
  arrive_at: string
  collect_until: string | null
  return_at: string | null
}

// Saque PvP (SW3): ataque à cidade de outro jogador.
export type Raid = {
  id: string
  attacker_city_id: string
  defender_city_id: string
  defender_name: string
  status: 'outbound' | 'returning' | 'done'
  attacker_won: boolean | null
  troops: Record<string, number>
  survivors: Record<string, number> | null
  loot: Amounts
  arrive_at: string
  return_at: string | null
}

// Ataque VINDO para você (alerta, com névoa: quem + quando, sem tropas).
export type IncomingRaid = {
  attacker_name: string
  arrive_at: string
}

// Alianças (SW3).
export type Alliance = { id: string; name: string; tag: string; entry_mode: 'open' | 'approval'; member_cap: number; members: number }
export type AllianceMember = { player_id: string; username: string; role: 'owner' | 'leader' | 'officer' | 'member'; joined_at: string }
export type JoinRequest = { id: string; player_id: string; username: string; created_at: string }
export type MyAlliance = { alliance: Alliance; my_role: 'owner' | 'leader' | 'officer' | 'member'; members: AllianceMember[]; requests: JoinRequest[] }

// Espionagem (SW3): batedores em treino + missões de scout.
export type ScoutQueued = { id: string; count: number; finish_at: string }
export type ScoutIntel = {
  garrison: Record<string, number>
  wall_level: number
  tower_level: number
  raidable: Amounts
}
export type ScoutMission = {
  id: string
  target_city_id: string
  target_name: string
  status: 'outbound' | 'returning' | 'done'
  intel: ScoutIntel | null
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
  march_capacity: number // máx. de tropas por expedição (cresce por era; pesquisa no futuro)
  marches: March[]
  world_marches: WorldMarch[]
  raids: Raid[] // saques que VOCÊ enviou (SW3)
  incoming: IncomingRaid[] // ataques VINDO para você
  scouts: number // batedores treinados, parados na cidade
  scouts_training: ScoutQueued[] // batedores em treino
  scout_missions: ScoutMission[] // missões de espionagem ativas
  active_battle_id: string
  server_now: string
}

// Batalha tática (estado autoritativo do servidor; render no cliente). Espelha
// internal/domain/battle.Battle + city.BattleView do backend.
export type Side = 'attacker' | 'defender'

export type BattleHex = { q: number; r: number }

// Tile de terreno especial (Lacuna). cover=Abrigo (−dano), hazard=Fenda instável (dano ao
// entrar), warp=Distorção (reduz ataque à distância). Espelha battle.TileType do backend.
export type TileType = 'cover' | 'hazard' | 'warp'
export type BattleTile = { pos: BattleHex; type: TileType }

export type BattleUnit = {
  id: string
  owner: Side
  key: string
  hp: number
  hp_per: number
  attack: number
  defense: number
  move: number
  range: number
  pos: BattleHex
}

export type Battle = {
  w: number
  h: number
  units: BattleUnit[]
  tiles: BattleTile[]
  turn: Side
  round: number
  max_rounds: number
  acted: Record<string, boolean>
  over: boolean
  winner: Side
  by_round_limit: boolean // terminou pelo TETO de rounds (decidida por HP, inimigo ainda vivo)
}

export type BattleView = {
  id: string
  province_id: string
  status: 'active' | 'resolved'
  state: Battle
}

export type BattleReport = {
  province_id: string
  province_name_key: string
  attacker_won: boolean
  sent: Record<string, number>
  losses: Record<string, number>
  survivors: Record<string, number>
  reward: Amounts
}

// Relatório de coleta de um nó (resultado de uma marcha a um world_target).
export type CollectReport = {
  target_id: string
  resource: string // "" quando bounce
  collected: number
  sent: Record<string, number>
  bounced: boolean // nó ocupado/esgotado ao chegar → voltou sem coletar
}

// Relatório de ataque a uma aldeia/criatura (combate one-shot).
export type RaidReport = {
  target_id: string
  target_kind: string // village | creature
  won: boolean
  loot: Amounts
  sent: Record<string, number>
  losses: Record<string, number>
}

// Relatórios do saque PvP (SW3).
export type RaidPvPReport = { defender_name: string; won: boolean; loot: Amounts; sent: Record<string, number>; losses: Record<string, number> }
export type DefenseReport = { attacker_name: string; attacker_won: boolean; stolen: Amounts; defender_losses: Record<string, number> }
export type IncomingReport = { attacker_name: string; arrive_at: string }
export type ScoutReport = { target_name: string } & ScoutIntel

export type Report = {
  id: string
  type: string
  read: boolean
  created_at: string
  payload: BattleReport | CollectReport | RaidReport | RaidPvPReport | DefenseReport | IncomingReport | ScoutReport
}

// Cidade vizinha no mapa-mundo compartilhado.
export type WorldCity = {
  id: string
  name: string
  region: string
  coord_x: number
  coord_y: number
  username: string
  alliance_id: string // "" se o dono não está em aliança
  alliance_tag: string // tag da aliança do dono (marca aliados no mapa)
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
  deposit: Amounts // renda passiva/hora enquanto mantida
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
  min_barracks_level: number
  carry: number // capacidade de carga (coleta de nós)
  era: number
}

export type Catalog = {
  growth: { production: number; cost: number; build_time: number }
  buildings: CatalogBuilding[]
  units: CatalogUnit[]
}
