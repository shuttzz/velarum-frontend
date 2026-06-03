import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Amounts, City, March, Province } from '../../types/game'
import { useCity } from '../../queries/useCity'
import { useProvinces } from '../../queries/useProvinces'
import { useArmyActions } from '../../queries/useGameMutations'
import { errorMessage } from '../../api/client'
import { formatDuration } from '../city/catalog'
import { useNow, secondsUntil } from '../../lib/useNow'
import { ResourceBar } from '../city/components/ResourceBar'
import { AccountControls } from '../../components/AccountControls'
import { ViewNav } from '../../components/ViewNav'
import { useGameUIStore } from '../../stores/useGameUIStore'

const HEX = 62 // raio do hexágono (px)

// axialToPixel: coordenada hex axial (q,r) → pixel (pointy-top), cidade no centro (0,0).
function axialToPixel(q: number, r: number) {
  return { x: HEX * Math.sqrt(3) * (q + r / 2), y: HEX * 1.5 * r }
}

function hexPoints(cx: number, cy: number, s: number) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push(`${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// Tela do mapa do mundo: províncias PvE do anel 1 (mapa instanciado), cidade no centro.
export function WorldMapView({ cityId }: { cityId: string }) {
  const { data: city } = useCity(cityId)
  const { data: provinces } = useProvinces(cityId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = provinces?.find((p) => p.id === selectedId) ?? null

  return (
    <div style={screen}>
      {city && <ResourceBar city={city} />}
      <div style={mapWrap}>
        {provinces && (
          <HexMap
            provinces={provinces}
            marches={city?.marches ?? []}
            selectedId={selectedId}
            cityName={city?.name ?? ''}
            onSelect={setSelectedId}
          />
        )}
      </div>
      {selected && city && <ProvincePanel city={city} province={selected} />}
      <ViewNav />
      <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
    </div>
  )
}

function HexMap({
  provinces,
  marches,
  selectedId,
  cityName,
  onSelect,
}: {
  provinces: Province[]
  marches: March[]
  selectedId: string | null
  cityName: string
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const activeProvinceIds = new Set(marches.filter((m) => m.status !== 'done').map((m) => m.province_id))

  return (
    <svg viewBox="-190 -172 380 344" style={{ width: 'min(92vw, 820px)', height: 'auto', maxHeight: '76vh' }}>
      {/* Cidade no centro */}
      <Hex
        cx={0}
        cy={0}
        fill="#2c3a5a"
        stroke="#6c8ebf"
        strokeWidth={2}
        lines={[
          { text: '🏛', size: 20 },
          { text: cityName, size: 11, color: '#cdd4e0' },
        ]}
      />

      {provinces.map((p) => {
        const { x, y } = axialToPixel(p.q, p.r)
        const conquered = p.status === 'conquered'
        const marching = activeProvinceIds.has(p.id)
        const sel = p.id === selectedId
        const lines: HexLine[] = [
          { text: conquered ? '✔' : '⚔', size: 15, color: conquered ? '#7fd99b' : '#e09a9a' },
          { text: t(`provinces.${p.name_key}`), size: 11, weight: 600 },
        ]
        if (marching) lines.push({ text: '⏳', size: 13, color: '#e0b04a' })
        else if (!conquered) lines.push({ text: `${p.def_attack}/${p.def_hp}`, size: 10, color: '#9aa3b2' })
        return (
          <Hex
            key={p.id}
            cx={x}
            cy={y}
            fill={conquered ? '#244a33' : '#4a2c2c'}
            stroke={sel ? '#e0b04a' : conquered ? '#4a8f63' : '#9f5a5a'}
            strokeWidth={sel ? 4 : 2}
            onClick={() => onSelect(p.id)}
            lines={lines}
          />
        )
      })}
    </svg>
  )
}

type HexLine = { text: string; size: number; color?: string; weight?: number }

// Hex desenha o polígono + um bloco de texto CENTRALIZADO verticalmente (linhas empilhadas
// em torno do centro do hex), evitando o amontoado de tspans alinhados pela base.
function Hex({
  cx,
  cy,
  fill,
  stroke,
  strokeWidth,
  onClick,
  lines,
}: {
  cx: number
  cy: number
  fill: string
  stroke: string
  strokeWidth: number
  onClick?: () => void
  lines: HexLine[]
}) {
  const lineH = 16
  const startY = cy - ((lines.length - 1) * lineH) / 2
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <polygon points={hexPoints(cx, cy, HEX)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {lines.map((ln, i) => (
        <text
          key={i}
          x={cx}
          y={startY + i * lineH}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="system-ui, sans-serif"
          fontSize={ln.size}
          fontWeight={ln.weight ?? 400}
          fill={ln.color ?? '#fff'}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {ln.text}
        </text>
      ))}
    </g>
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
          <button onClick={attack} disabled={busy || totalSelected === 0} style={attackBtn}>
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

const mapWrap: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
