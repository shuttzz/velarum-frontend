import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, City, Province, Troop, WorldTarget } from '../../types/game'
import { useCity } from '../../queries/useCity'
import { useProvinces } from '../../queries/useProvinces'
import { useWorldCities } from '../../queries/useWorldCities'
import { useWorldTargets } from '../../queries/useWorldTargets'
import { useCatalog } from '../../queries/useCatalog'
import { useArmyActions } from '../../queries/useGameMutations'
import { predictAutoResolve, type Prediction } from '../combat/predict'
import { errorMessage } from '../../api/client'
import { formatDuration, marchQueueUsed, queuesForEra } from '../city/catalog'
import { useNow, secondsUntil } from '../../lib/useNow'
import { ResourceBar } from '../city/components/ResourceBar'
import { AccountControls } from '../../components/AccountControls'
import { ViewNav } from '../../components/ViewNav'
import { useGameUIStore } from '../../stores/useGameUIStore'
import { WorldMapCanvas } from '../../game/worldmap/WorldMapCanvas'
import type { MapHex } from '../../game/worldmap/WorldMapRenderer'
import { WORLD_REGIONS } from '../../game/worldmap/regions'

// Tela do mapa do mundo: cidade no centro + províncias PvE (mapa instanciado), renderizado em
// PixiJS (pan/zoom). Painel da província + HUD por cima.
export function WorldMapView({ cityId }: { cityId: string }) {
  const { t } = useTranslation()
  const { data: city } = useCity(cityId)
  const { data: provinces } = useProvinces(cityId)
  const { data: worldCities } = useWorldCities(!!city)
  const { data: worldTargets } = useWorldTargets(!!city)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [worldView, setWorldView] = useState(false)

  // Regiões (relativas à sua cidade) e o (0,0) do mundo — para a visão Mundo (divisões + rótulos).
  const regions = useMemo(
    () => WORLD_REGIONS.map((rg) => ({ label: t(`regions.${rg.key}`), q: rg.cx - (city?.coord_x ?? 0), r: rg.cy - (city?.coord_y ?? 0) })),
    [city?.coord_x, city?.coord_y, t],
  )
  const worldOrigin = { q: -(city?.coord_x ?? 0), r: -(city?.coord_y ?? 0) }
  const selected = provinces?.find((p) => p.id === selectedId) ?? null
  const selectedTarget = worldTargets?.find((tg) => `nd:${tg.id}` === selectedId) ?? null

  const activeProvinceIds = useMemo(
    () => new Set((city?.marches ?? []).filter((m) => m.status !== 'done').map((m) => m.province_id)),
    [city?.marches],
  )
  const activeNodeIds = useMemo(
    () => new Set((city?.world_marches ?? []).filter((m) => m.status !== 'done').map((m) => m.target_id)),
    [city?.world_marches],
  )

  const hexes = useMemo<MapHex[]>(() => {
    const out: MapHex[] = [{ id: 'city', kind: 'city', q: 0, r: 0, title: city?.name ?? '' }]
    for (const p of provinces ?? []) {
      const conquered = p.status === 'conquered'
      out.push({
        id: p.id,
        kind: 'province',
        q: p.q,
        r: p.r,
        title: t(`provinces.${p.name_key}`),
        subtitle: conquered ? '' : `${p.def_attack}/${p.def_hp}`,
        status: p.status,
        marching: activeProvinceIds.has(p.id),
      })
    }
    // Cidades vizinhas (mundo compartilhado), posicionadas RELATIVAS à sua cidade (você = centro).
    if (city) {
      for (const n of worldCities ?? []) {
        if (n.id === city.id) continue // a sua cidade já é o marcador central
        out.push({
          id: `nb:${n.id}`,
          kind: 'neighbor',
          q: n.coord_x - city.coord_x,
          r: n.coord_y - city.coord_y,
          title: n.name,
          subtitle: `@${n.username}`,
        })
      }
      // Alvos PvE compartilhados (nós de recurso + aldeias/criaturas), relativos à sua cidade.
      for (const tg of worldTargets ?? []) {
        const base = { id: `nd:${tg.id}`, q: tg.coord_x - city.coord_x, r: tg.coord_y - city.coord_y, marching: activeNodeIds.has(tg.id) }
        if (tg.kind === 'node') {
          out.push({
            ...base,
            kind: 'node',
            title: `${t(`resourceShort.${tg.resource}`)} ${'★'.repeat(tg.level)}`,
            subtitle: tg.status === 'occupied' ? t('node.occupied') : `${Math.round(tg.amount_remaining)}`,
            resource: tg.resource,
          })
        } else {
          out.push({
            ...base,
            kind: tg.kind,
            title: `${t(`target.${tg.kind}`)} ${'★'.repeat(tg.level)}`,
            subtitle: `⚔ ${tg.def_attack} · ♥ ${tg.def_hp}`,
          })
        }
      }
    }
    return resolveOverlaps(out)
  }, [provinces, worldCities, worldTargets, city, activeProvinceIds, activeNodeIds, t])

  return (
    <div style={screen}>
      <WorldMapCanvas
        hexes={hexes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        worldView={worldView}
        regions={regions}
        worldOrigin={worldOrigin}
      />
      {city && <ResourceBar city={city} />}
      {selected && !worldView && city && <ProvincePanel city={city} province={selected} />}
      {selectedTarget && !worldView && city && (selectedTarget.kind === 'node' ? <NodePanel city={city} target={selectedTarget} /> : <CombatTargetPanel city={city} target={selectedTarget} />)}
      <button onClick={() => setWorldView((v) => !v)} style={worldToggleBtn}>
        {worldView ? t('worldmap.viewRegion') : t('worldmap.viewWorld')}
      </button>
      <ViewNav />
      <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
    </div>
  )
}

// Direções axiais (pointy-top) para varrer anéis ao redor de uma célula.
const HEX_DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
]

// nearestFreeCell acha a célula axial livre mais próxima de (q,r), varrendo anéis crescentes.
function nearestFreeCell(q: number, r: number, occupied: Set<string>): { q: number; r: number } {
  for (let radius = 1; radius < 30; radius++) {
    let cq = q + HEX_DIRS[4][0] * radius
    let cr = r + HEX_DIRS[4][1] * radius
    for (let side = 0; side < 6; side++) {
      for (let i = 0; i < radius; i++) {
        if (!occupied.has(`${cq},${cr}`)) return { q: cq, r: cr }
        cq += HEX_DIRS[side][0]
        cr += HEX_DIRS[side][1]
      }
    }
  }
  return { q, r }
}

// resolveOverlaps garante que NENHUM marcador fique na mesma célula. Cidade e províncias (posições
// próprias do jogador) ficam fixas; vizinhos/nós/aldeias/criaturas que caírem numa célula ocupada
// são empurrados para a célula livre mais próxima — evita alvos sobrepostos/escondidos no mapa.
// (Províncias usam coords locais e alvos do mundo coords relativas: podem coincidir.)
function resolveOverlaps(hexes: MapHex[]): MapHex[] {
  const occupied = new Set<string>()
  const out: MapHex[] = []
  for (const h of hexes) {
    if (h.kind === 'city' || h.kind === 'province') {
      occupied.add(`${h.q},${h.r}`)
      out.push(h)
    }
  }
  for (const h of hexes) {
    if (h.kind === 'city' || h.kind === 'province') continue
    let { q, r } = h
    if (occupied.has(`${q},${r}`)) {
      const free = nearestFreeCell(q, r, occupied)
      q = free.q
      r = free.r
    }
    occupied.add(`${q},${r}`)
    out.push({ ...h, q, r })
  }
  return out
}

// TroopSelector: lista a guarnição com um input por unidade + botão MÁX (envia tudo daquele tipo).
// Compartilhado pelos painéis de província, nó e aldeia/criatura.
function TroopSelector({
  troops,
  send,
  setSend,
}: {
  troops: Troop[]
  send: Record<string, number>
  setSend: Dispatch<SetStateAction<Record<string, number>>>
}) {
  const { t } = useTranslation()
  return (
    <>
      {troops.map((tr) => (
        <div key={tr.unit_type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ flex: 1, fontSize: 13 }}>
            {t(`units.${tr.unit_type}`)} <span style={{ color: '#6b7280' }}>({tr.count})</span>
          </span>
          <input
            type="number"
            min={0}
            max={tr.count}
            value={send[tr.unit_type] ?? 0}
            onChange={(e) => {
              const v = Math.max(0, Math.min(tr.count, Number(e.target.value) || 0))
              setSend((s) => ({ ...s, [tr.unit_type]: v }))
            }}
            style={input}
          />
          <button type="button" onClick={() => setSend((s) => ({ ...s, [tr.unit_type]: tr.count }))} style={maxBtn}>
            {t('map.max')}
          </button>
        </div>
      ))}
    </>
  )
}

function ProvincePanel({ city, province }: { city: City; province: Province }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const { march, startBattle } = useArmyActions(city.id)
  const openBattle = useGameUIStore((s) => s.openBattle)
  const now = useNow()
  const active = city.marches.find((m) => m.province_id === province.id && m.status !== 'done')
  const [send, setSend] = useState<Record<string, number>>({})

  // Previsão DETERMINÍSTICA do auto-resolve com as tropas selecionadas (não vai às cegas).
  const prediction = useMemo<Prediction | null>(() => {
    const troops: Record<string, number> = {}
    for (const [k, v] of Object.entries(send)) if (v > 0) troops[k] = v
    if (Object.keys(troops).length === 0 || !catalog) return null
    const stat = (key: string) => {
      const u = catalog.units.find((x) => x.key === key)
      return u ? { attack: u.attack, hp: u.hp } : undefined
    }
    return predictAutoResolve(troops, stat, { attack: province.def_attack, hp: province.def_hp })
  }, [send, catalog, province.def_attack, province.def_hp])

  function selectedTroops(): Record<string, number> {
    const troops: Record<string, number> = {}
    for (const [k, v] of Object.entries(send)) if (v > 0) troops[k] = v
    return troops
  }

  function attack() {
    const troops = selectedTroops()
    if (Object.keys(troops).length === 0) return
    march.mutate({ province_id: province.id, troops }, { onSuccess: () => setSend({}) })
  }

  function fight() {
    const troops = selectedTroops()
    if (Object.keys(troops).length === 0) return
    startBattle.mutate(
      { province_id: province.id, troops },
      {
        onSuccess: (view) => {
          setSend({})
          openBattle(view.id)
        },
      },
    )
  }

  const totalSelected = Object.values(send).reduce((a, b) => a + b, 0)
  const busy = march.isPending || startBattle.isPending
  const marchLimit = queuesForEra(city.era)
  const marchUsed = marchQueueUsed(city)
  const marchFull = marchUsed >= marchLimit

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>{t(`provinces.${province.name_key}`)}</div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>
        {province.status === 'conquered' ? `✔ ${t('map.conquered')}` : t('map.unconquered')}
      </div>
      <div style={{ fontSize: 12, marginTop: 6 }}>
        {t('map.defense')}: ⚔ {province.def_attack} · ♥ {province.def_hp}
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>
        {t('map.reward')}: <CostLine amounts={province.reward} />
      </div>
      {(province.deposit.matter > 0 || province.deposit.energy > 0 || province.deposit.knowledge > 0) && (
        <div style={{ fontSize: 12, color: province.status === 'conquered' ? '#7fd99b' : '#9aa3b2' }}>
          {t('map.deposit')}: <CostLine amounts={province.deposit} />/h
        </div>
      )}

      {/* Marcha em andamento para esta província */}
      {active ? (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {active.status === 'returning' && active.attacker_won != null && (
            <div style={{ color: active.attacker_won ? '#5ad17a' : '#e0884a', fontWeight: 600 }}>
              {active.attacker_won ? t('map.victory') : t('map.defeat')}
            </div>
          )}
          <div style={{ color: '#e0b04a' }}>
            {active.status === 'outbound'
              ? t('map.outbound', { time: formatDuration(secondsUntil(active.arrive_at, now)) })
              : t('map.returning', { time: formatDuration(secondsUntil(active.return_at ?? active.arrive_at, now)) })}
          </div>
        </div>
      ) : province.status === 'conquered' ? null : city.troops.length === 0 ? (
        <p style={{ fontSize: 12, color: '#c2724a', marginTop: 10 }}>{t('map.noArmy')}</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#9aa3b2', marginBottom: 4 }}>{t('map.selectTroops')}</div>
          <TroopSelector troops={city.troops} send={send} setSend={setSend} />
          {prediction && <Forecast prediction={prediction} />}
          <div style={{ fontSize: 11, marginTop: 6, color: marchFull ? '#e0b04a' : '#6b7280' }}>
            {t('map.marchQueue', { used: marchUsed, max: marchLimit })}
            {marchFull && ` · ${t('map.marchQueueFull')}`}
          </div>
          <button onClick={attack} disabled={busy || totalSelected === 0 || marchFull} style={attackBtn}>
            {march.isPending ? t('map.attacking') : t('map.send')}
          </button>
          <button onClick={fight} disabled={busy || totalSelected === 0} style={battleBtn}>
            {startBattle.isPending ? t('battle.starting') : t('battle.fight')}
          </button>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0' }}>{t('battle.fightHint')}</p>
          {(march.isError || startBattle.isError) && (
            <p style={{ fontSize: 12, color: '#e0884a', margin: '6px 0 0' }}>
              {errorMessage(march.error ?? startBattle.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function NodePanel({ city, target }: { city: City; target: WorldTarget }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const { collect } = useArmyActions(city.id)
  const now = useNow()
  const active = city.world_marches.find((m) => m.target_id === target.id && m.status !== 'done')
  const [send, setSend] = useState<Record<string, number>>({})

  function doCollect() {
    const troops: Record<string, number> = {}
    for (const [k, v] of Object.entries(send)) if (v > 0) troops[k] = v
    if (Object.keys(troops).length === 0) return
    collect.mutate({ target_id: target.id, troops }, { onSuccess: () => setSend({}) })
  }

  const totalSelected = Object.values(send).reduce((a, b) => a + b, 0)
  // Capacidade de carga total das tropas selecionadas e quanto de fato vão coletar nesta viagem
  // (min(carga, restante) — o jogador vê quanto "cabe").
  const totalCarry = useMemo(() => {
    if (!catalog) return 0
    let c = 0
    for (const [k, v] of Object.entries(send)) {
      if (v > 0) {
        const u = catalog.units.find((x) => x.key === k)
        if (u) c += u.carry * v
      }
    }
    return c
  }, [send, catalog])
  const willCollect = Math.min(totalCarry, Math.round(target.amount_remaining))
  const marchLimit = queuesForEra(city.era)
  const marchUsed = marchQueueUsed(city)
  const marchFull = marchUsed >= marchLimit
  const hasLoot = !!(active && (active.loot.matter || active.loot.energy || active.loot.knowledge))

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>
        {t('node.title', { resource: t(`resourceShort.${target.resource}`), level: target.level })}
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b2', marginTop: 2 }}>
        {t('node.remaining')}: {Math.round(target.amount_remaining)} / {Math.round(target.amount_total)}
      </div>
      {target.status === 'occupied' && <div style={{ fontSize: 12, color: '#e0b04a' }}>{t('node.occupied')}</div>}

      {active ? (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <div style={{ color: '#e0b04a' }}>
            {active.status === 'outbound' && t('node.outbound', { time: formatDuration(secondsUntil(active.arrive_at, now)) })}
            {active.status === 'collecting' && t('node.collecting', { time: formatDuration(secondsUntil(active.collect_until ?? active.arrive_at, now)) })}
            {active.status === 'returning' && t('node.returning', { time: formatDuration(secondsUntil(active.return_at ?? active.arrive_at, now)) })}
          </div>
          {hasLoot && (
            <div style={{ fontSize: 12, color: '#7fd99b', marginTop: 4 }}>
              {t('node.loot')}: <CostLine amounts={active.loot} />
            </div>
          )}
        </div>
      ) : city.troops.length === 0 ? (
        <p style={{ fontSize: 12, color: '#c2724a', marginTop: 10 }}>{t('map.noArmy')}</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#9aa3b2', marginBottom: 4 }}>{t('map.selectTroops')}</div>
          <TroopSelector troops={city.troops} send={send} setSend={setSend} />
          {totalSelected > 0 && (
            <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.25)', fontSize: 12 }}>
              <div style={{ color: '#9aa3b2' }}>
                {t('node.capacity')}: <strong style={{ color: '#cdd5e3' }}>{totalCarry}</strong>
              </div>
              <div style={{ color: '#7fd99b' }}>
                {t('node.willCollect')}: {willCollect} {t(`resourceShort.${target.resource}`)}
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, marginTop: 6, color: marchFull ? '#e0b04a' : '#6b7280' }}>
            {t('map.marchQueue', { used: marchUsed, max: marchLimit })}
            {marchFull && ` · ${t('map.marchQueueFull')}`}
          </div>
          <button onClick={doCollect} disabled={collect.isPending || totalSelected === 0 || marchFull} style={attackBtn}>
            {collect.isPending ? t('node.sending') : t('node.collect')}
          </button>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0' }}>{t('node.hint')}</p>
          {collect.isError && (
            <p style={{ fontSize: 12, color: '#e0884a', margin: '6px 0 0' }}>{errorMessage(collect.error)}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Painel de ALVO DE COMBATE (aldeia/criatura): defesa + loot + previsão (Forecast) + atacar.
function CombatTargetPanel({ city, target }: { city: City; target: WorldTarget }) {
  const { t } = useTranslation()
  const { data: catalog } = useCatalog()
  const { collect } = useArmyActions(city.id)
  const now = useNow()
  const active = city.world_marches.find((m) => m.target_id === target.id && m.status !== 'done')
  const [send, setSend] = useState<Record<string, number>>({})

  function doAttack() {
    const troops: Record<string, number> = {}
    for (const [k, v] of Object.entries(send)) if (v > 0) troops[k] = v
    if (Object.keys(troops).length === 0) return
    collect.mutate({ target_id: target.id, troops }, { onSuccess: () => setSend({}) })
  }

  const prediction = useMemo<Prediction | null>(() => {
    const troops: Record<string, number> = {}
    for (const [k, v] of Object.entries(send)) if (v > 0) troops[k] = v
    if (Object.keys(troops).length === 0 || !catalog) return null
    const stat = (key: string) => {
      const u = catalog.units.find((x) => x.key === key)
      return u ? { attack: u.attack, hp: u.hp } : undefined
    }
    return predictAutoResolve(troops, stat, { attack: target.def_attack, hp: target.def_hp })
  }, [send, catalog, target.def_attack, target.def_hp])

  const totalSelected = Object.values(send).reduce((a, b) => a + b, 0)
  const marchLimit = queuesForEra(city.era)
  const marchUsed = marchQueueUsed(city)
  const marchFull = marchUsed >= marchLimit
  const hasReward = !!(target.reward.matter || target.reward.energy || target.reward.knowledge)

  return (
    <div style={panel}>
      <div style={{ fontWeight: 600 }}>
        {t(`target.${target.kind}`)} {'★'.repeat(target.level)}
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {t('map.defense')}: ⚔ {target.def_attack} · ♥ {target.def_hp}
      </div>
      {hasReward && (
        <div style={{ fontSize: 12, color: '#9aa3b2' }}>
          {t('map.reward')}: <CostLine amounts={target.reward} />
        </div>
      )}

      {active ? (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {active.status === 'returning' && active.attacker_won != null && (
            <div style={{ color: active.attacker_won ? '#5ad17a' : '#e0884a', fontWeight: 600 }}>
              {active.attacker_won ? t('map.victory') : t('map.defeat')}
            </div>
          )}
          <div style={{ color: '#e0b04a' }}>
            {active.status === 'outbound'
              ? t('map.outbound', { time: formatDuration(secondsUntil(active.arrive_at, now)) })
              : t('map.returning', { time: formatDuration(secondsUntil(active.return_at ?? active.arrive_at, now)) })}
          </div>
        </div>
      ) : city.troops.length === 0 ? (
        <p style={{ fontSize: 12, color: '#c2724a', marginTop: 10 }}>{t('map.noArmy')}</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#9aa3b2', marginBottom: 4 }}>{t('map.selectTroops')}</div>
          <TroopSelector troops={city.troops} send={send} setSend={setSend} />
          {prediction && <Forecast prediction={prediction} />}
          <div style={{ fontSize: 11, marginTop: 6, color: marchFull ? '#e0b04a' : '#6b7280' }}>
            {t('map.marchQueue', { used: marchUsed, max: marchLimit })}
            {marchFull && ` · ${t('map.marchQueueFull')}`}
          </div>
          <button onClick={doAttack} disabled={collect.isPending || totalSelected === 0 || marchFull} style={attackBtn}>
            {collect.isPending ? t('map.attacking') : t('map.attack')}
          </button>
          {collect.isError && (
            <p style={{ fontSize: 12, color: '#e0884a', margin: '6px 0 0' }}>{errorMessage(collect.error)}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Cor por tier de previsão (melhor → pior).
const TIER_COLOR: Record<string, string> = {
  certain_win: '#4ade80',
  win: '#5ad17a',
  risky: '#e0b04a',
  no_chance: '#e0884a',
  suicide: '#e05a5a',
}

// Forecast mostra SÓ o tier qualitativo (Vitória certa / Vitória / Arriscado / Sem chances /
// Suicídio) das tropas selecionadas — sem números de perdas, pra manter a TENSÃO do risco (mostrar
// a baixa exata tiraria o "arriscar"). Determinístico (espelha o auto-resolve do backend).
function Forecast({ prediction }: { prediction: Prediction }) {
  const { t } = useTranslation()
  const color = TIER_COLOR[prediction.tier]
  return (
    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, textAlign: 'center', background: 'rgba(0,0,0,0.25)', border: `1px solid ${color}66` }}>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{t(`forecast.${prediction.tier}`)}</span>
    </div>
  )
}

function CostLine({ amounts }: { amounts: Amounts }) {
  const { t } = useTranslation()
  const parts: string[] = []
  if (amounts.matter) parts.push(`${amounts.matter} ${t('resourceShort.matter')}`)
  if (amounts.energy) parts.push(`${amounts.energy} ${t('resourceShort.energy')}`)
  if (amounts.knowledge) parts.push(`${amounts.knowledge} ${t('resourceShort.knowledge')}`)
  return <>{parts.join(' · ')}</>
}

const screen: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  background: '#0d1016',
  overflow: 'hidden',
}

const worldToggleBtn: CSSProperties = {
  position: 'absolute',
  top: 60,
  left: 16,
  padding: '8px 14px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: 'rgba(44,58,90,0.92)',
  color: '#fff',
  cursor: 'pointer',
  pointerEvents: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 80,
  right: 16,
  width: 240,
  padding: 12,
  background: 'rgba(17,20,28,0.92)',
  color: '#fff',
  borderRadius: 8,
  fontFamily: 'system-ui, sans-serif',
}

const input: CSSProperties = {
  width: 56,
  padding: '4px 6px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #39415a',
  background: '#11141c',
  color: '#fff',
}

const maxBtn: CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  borderRadius: 6,
  border: '1px solid #4a5570',
  background: '#2a3142',
  color: '#cdd5e3',
  cursor: 'pointer',
}

const attackBtn: CSSProperties = {
  marginTop: 6,
  width: '100%',
  padding: '8px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
  cursor: 'pointer',
}

const battleBtn: CSSProperties = {
  marginTop: 6,
  width: '100%',
  padding: '8px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #9f5a5a',
  background: '#4a2c2c',
  color: '#fff',
  cursor: 'pointer',
}
