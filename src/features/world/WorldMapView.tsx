import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, City, Province } from '../../types/game'
import { useCity } from '../../queries/useCity'
import { useProvinces } from '../../queries/useProvinces'
import { useWorldCities } from '../../queries/useWorldCities'
import { useArmyActions } from '../../queries/useGameMutations'
import { errorMessage } from '../../api/client'
import { formatDuration, marchQueueUsed, queuesForEra } from '../city/catalog'
import { useNow, secondsUntil } from '../../lib/useNow'
import { ResourceBar } from '../city/components/ResourceBar'
import { AccountControls } from '../../components/AccountControls'
import { ViewNav } from '../../components/ViewNav'
import { useGameUIStore } from '../../stores/useGameUIStore'
import { WorldMapCanvas } from '../../game/worldmap/WorldMapCanvas'
import type { MapHex } from '../../game/worldmap/WorldMapRenderer'

// Tela do mapa do mundo: cidade no centro + províncias PvE (mapa instanciado), renderizado em
// PixiJS (pan/zoom). Painel da província + HUD por cima.
export function WorldMapView({ cityId }: { cityId: string }) {
  const { t } = useTranslation()
  const { data: city } = useCity(cityId)
  const { data: provinces } = useProvinces(cityId)
  const { data: worldCities } = useWorldCities(!!city)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = provinces?.find((p) => p.id === selectedId) ?? null

  const activeProvinceIds = useMemo(
    () => new Set((city?.marches ?? []).filter((m) => m.status !== 'done').map((m) => m.province_id)),
    [city?.marches],
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
    }
    return out
  }, [provinces, worldCities, city, activeProvinceIds, t])

  return (
    <div style={screen}>
      <WorldMapCanvas hexes={hexes} selectedId={selectedId} onSelect={setSelectedId} />
      {city && <ResourceBar city={city} />}
      {selected && city && <ProvincePanel city={city} province={selected} />}
      <ViewNav />
      <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
    </div>
  )
}

function ProvincePanel({ city, province }: { city: City; province: Province }) {
  const { t } = useTranslation()
  const { march, startBattle } = useArmyActions(city.id)
  const openBattle = useGameUIStore((s) => s.openBattle)
  const now = useNow()
  const active = city.marches.find((m) => m.province_id === province.id && m.status !== 'done')
  const [send, setSend] = useState<Record<string, number>>({})

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
          {city.troops.map((tr) => (
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
            </div>
          ))}
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
