import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Battle, BattleHex, BattleUnit, TileType } from '../../types/game'
import { useBattle, useBattleActions } from '../../queries/useBattle'
import { useGameUIStore } from '../../stores/useGameUIStore'
import { errorMessage } from '../../api/client'
import { unitColor } from '../city/buildingVisual'
import { attackOption, attackableTargets, canControl, hexKey, hpFraction, movableHexes, stackCount, unitAt } from './logic'

const HEX = 34 // raio do hexágono (px)

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

const UNIT_ICONS: Record<string, string> = { lanceiro: '🗡️', arqueiro: '🏹', guarda: '🛡️' }
function unitIcon(key: string): string {
  return UNIT_ICONS[key] ?? '⚔️'
}

// Aparência dos tiles de Lacuna (cor de fundo da casa + ícone + borda). Ordem da legenda.
const TILE_META: Record<TileType, { icon: string; fill: string; stroke: string }> = {
  cover: { icon: '🧱', fill: '#243348', stroke: '#4a6c9f' },
  hazard: { icon: '🌋', fill: '#3e2418', stroke: '#9f6a4a' },
  warp: { icon: '🌀', fill: '#2c2348', stroke: '#7b6cbf' },
}
const TILE_ORDER: TileType[] = ['cover', 'hazard', 'warp']

// Overlay da batalha tática: lê a batalha pelo id do store, renderiza o tabuleiro hex e conduz
// os turnos do jogador. O servidor é autoritativo — cada ação devolve o estado novo.
export function BattleView({ cityId }: { cityId: string }) {
  const { t } = useTranslation()
  const battleId = useGameUIStore((s) => s.battleId)
  const closeBattle = useGameUIStore((s) => s.closeBattle)
  const { data: view, isLoading, isError, error } = useBattle(cityId, battleId)
  const { act, endTurn } = useBattleActions(cityId, battleId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inspect, setInspect] = useState<TileType | null>(null)

  const battle = view?.state ?? null
  const busy = act.isPending || endTurn.isPending

  // Limpa a seleção quando a unidade some, morre, já agiu, ou a batalha acaba.
  useEffect(() => {
    if (!battle || !selectedId) return
    const u = battle.units.find((x) => x.id === selectedId)
    if (!u || !canControl(battle, u)) setSelectedId(null)
  }, [battle, selectedId])

  if (!battleId) return null

  return (
    <div style={overlay}>
      <div style={card}>
        {isLoading && <p style={{ color: '#9aa3b2' }}>{t('common.loading')}</p>}
        {isError && <p style={{ color: '#e0884a' }}>{errorMessage(error)}</p>}
        {battle && view && (
          <>
            <Header battle={battle} />
            <Board
              battle={battle}
              selectedId={selectedId}
              disabled={busy || battle.over}
              onSelectUnit={setSelectedId}
              onInspectTile={setInspect}
              onMove={(unit, hex) => {
                setSelectedId(null)
                act.mutate({ unit_id: unit.id, move_to: hex })
              }}
              onAttack={(unit, target) => {
                const opt = attackOption(battle, unit, target)
                if (!opt) return
                setSelectedId(null)
                act.mutate({ unit_id: unit.id, ...opt })
              }}
            />
            <Legend battle={battle} onInspectTile={setInspect} />
            {(act.isError || endTurn.isError) && (
              <p style={{ color: '#e0884a', fontSize: 13, margin: '6px 0 0' }}>
                {errorMessage(act.error ?? endTurn.error)}
              </p>
            )}
            <Footer
              battle={battle}
              busy={busy}
              onEndTurn={() => {
                setSelectedId(null)
                endTurn.mutate()
              }}
              onClose={closeBattle}
            />
            {inspect && <TileInfo tile={inspect} onClose={() => setInspect(null)} />}
          </>
        )}
      </div>
    </div>
  )
}

function Header({ battle }: { battle: Battle }) {
  const { t } = useTranslation()
  if (battle.over) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: 16 }}>{t('battle.title')}</span>
      <span style={{ fontSize: 13, color: '#9aa3b2' }}>
        {t('battle.round', { n: battle.round + 1, max: battle.max_rounds })}
      </span>
    </div>
  )
}

function Board({
  battle,
  selectedId,
  disabled,
  onSelectUnit,
  onInspectTile,
  onMove,
  onAttack,
}: {
  battle: Battle
  selectedId: string | null
  disabled: boolean
  onSelectUnit: (id: string) => void
  onInspectTile: (tile: TileType) => void
  onMove: (unit: BattleUnit, hex: BattleHex) => void
  onAttack: (unit: BattleUnit, target: BattleUnit) => void
}) {
  const selected = selectedId ? (battle.units.find((u) => u.id === selectedId) ?? null) : null

  const tileBy = useMemo(() => {
    const m = new Map<string, TileType>()
    for (const tl of battle.tiles ?? []) m.set(hexKey(tl.pos), tl.type)
    return m
  }, [battle.tiles])

  // Conjuntos de destaque (movimento/ataque) recalculados quando muda a seleção.
  const { moveSet, attackSet } = useMemo(() => {
    if (!selected) return { moveSet: new Set<string>(), attackSet: new Set<string>() }
    const m = new Set(movableHexes(battle, selected).map(hexKey))
    const a = new Set(attackableTargets(battle, selected).map((u) => hexKey(u.pos)))
    return { moveSet: m, attackSet: a }
  }, [battle, selected])

  // Geometria: centros de todas as células + viewBox com folga de um raio.
  const { centers, viewBox } = useMemo(() => {
    const c = new Map<string, { x: number; y: number }>()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let q = 0; q < battle.w; q++) {
      for (let r = 0; r < battle.h; r++) {
        const p = axialToPixel(q, r)
        c.set(`${q},${r}`, p)
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
    }
    const pad = HEX + 4
    return {
      centers: c,
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
    }
  }, [battle.w, battle.h])

  function cellClick(hex: BattleHex) {
    const tile = tileBy.get(hexKey(hex))
    const inspectIfTile = () => {
      if (tile) onInspectTile(tile)
    }
    // Batalha ocupada/encerrada: clicar numa Lacuna só revela sua legenda/história.
    if (disabled) {
      inspectIfTile()
      return
    }
    const occupant = unitAt(battle, hex)
    // Selecionar/alternar uma unidade comandável.
    if (occupant && canControl(battle, occupant)) {
      onSelectUnit(occupant.id === selectedId ? '' : occupant.id)
      return
    }
    // Com unidade selecionada, a jogada (mover/atacar) tem prioridade sobre inspecionar.
    if (selected) {
      if (occupant && occupant.owner !== selected.owner) {
        if (attackSet.has(hexKey(hex))) onAttack(selected, occupant)
        else inspectIfTile()
        return
      }
      if (!occupant && moveSet.has(hexKey(hex))) {
        onMove(selected, hex)
        return
      }
    }
    // Sem jogada aplicável: se a casa é uma Lacuna, mostra a legenda + história.
    inspectIfTile()
  }

  const cells: BattleHex[] = []
  for (let q = 0; q < battle.w; q++) for (let r = 0; r < battle.h; r++) cells.push({ q, r })

  return (
    <svg viewBox={viewBox} style={{ width: 'min(86vw, 560px)', height: 'auto', maxHeight: '64vh', display: 'block' }}>
      {cells.map((h) => {
        const k = hexKey(h)
        const p = centers.get(k)!
        const isMove = moveSet.has(k)
        const isAttack = attackSet.has(k)
        const tile = tileBy.get(k)
        const meta = tile ? TILE_META[tile] : null
        // Fundo = cor do tile (Lacuna) ou neutro; o destaque de ação vira ANEL (stroke) para
        // não esconder a Lacuna sob a casa.
        const fill = meta ? meta.fill : '#171b24'
        const stroke = isAttack ? '#e0593a' : isMove ? '#5ad17a' : meta ? meta.stroke : '#2a3140'
        const strokeWidth = isMove || isAttack ? 2.5 : meta ? 2 : 1
        return (
          <g key={k}>
            <polygon
              points={hexPoints(p.x, p.y, HEX - 1)}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
              onClick={() => cellClick(h)}
            />
            {meta && (
              <text
                x={p.x}
                y={p.y - HEX * 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                style={pointerNone}
              >
                {meta.icon}
              </text>
            )}
          </g>
        )
      })}
      {battle.units
        .filter((u) => u.hp > 0)
        .map((u) => {
          const p = centers.get(hexKey(u.pos))!
          return (
            <UnitToken
              key={u.id}
              unit={u}
              cx={p.x}
              cy={p.y}
              selected={u.id === selectedId}
              dimmed={u.owner === 'attacker' && !canControl(battle, u) && !battle.over}
              onClick={() => cellClick(u.pos)}
            />
          )
        })}
    </svg>
  )
}

function UnitToken({
  unit,
  cx,
  cy,
  selected,
  dimmed,
  onClick,
}: {
  unit: BattleUnit
  cx: number
  cy: number
  selected: boolean
  dimmed: boolean
  onClick: () => void
}) {
  const color = unit.owner === 'attacker' ? unitColor(unit.key) : '#7a3b3b'
  const frac = hpFraction(unit)
  const barW = HEX * 1.15
  const barY = cy + HEX * 0.62 + 3
  return (
    <g onClick={onClick} style={{ cursor: 'pointer', opacity: dimmed ? 0.5 : 1 }}>
      <title>{`${unit.hp} HP · ×${stackCount(unit)}`}</title>
      <circle
        cx={cx}
        cy={cy}
        r={HEX * 0.62}
        fill={color}
        stroke={selected ? '#e0b04a' : unit.owner === 'attacker' ? '#cfe0ff' : '#e0a0a0'}
        strokeWidth={selected ? 3.5 : 2}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fontSize={16} style={pointerNone}>
        {unitIcon(unit.key)}
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={700}
        fill="#fff"
        fontFamily="system-ui, sans-serif"
        style={pointerNone}
      >
        ×{stackCount(unit)} · {unit.hp}
      </text>
      {/* Barra de HP do escalão atual: deixa o "chip damage" visível mesmo sem perder figura. */}
      <rect x={cx - barW / 2} y={barY} width={barW} height={4} rx={2} fill="#000" opacity={0.45} style={pointerNone} />
      <rect
        x={cx - barW / 2}
        y={barY}
        width={Math.max(0, barW * frac)}
        height={4}
        rx={2}
        fill={frac > 0.5 ? '#5ad17a' : frac > 0.25 ? '#e0b04a' : '#e0593a'}
        style={pointerNone}
      />
    </g>
  )
}

// Legenda dos tiles de Lacuna presentes no tabuleiro (só mostra os tipos em jogo). Clicar num
// item abre a legenda/história do tile (mesma de clicar na casa no tabuleiro).
function Legend({ battle, onInspectTile }: { battle: Battle; onInspectTile: (tile: TileType) => void }) {
  const { t } = useTranslation()
  const present = new Set((battle.tiles ?? []).map((tl) => tl.type))
  const types = TILE_ORDER.filter((tt) => present.has(tt))
  if (types.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 10, fontSize: 12, color: '#9aa3b2' }}>
      {types.map((tt) => (
        <button key={tt} type="button" onClick={() => onInspectTile(tt)} style={legendItem}>
          {TILE_META[tt].icon} {t(`battle.tile.${tt}`)}
        </button>
      ))}
    </div>
  )
}

// TileInfo: painel com o nome, o efeito mecânico e a história (lore) de uma Lacuna.
function TileInfo({ tile, onClose }: { tile: TileType; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={tileInfoBackdrop} onClick={onClose}>
      <div style={tileInfoCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>{TILE_META[tile].icon}</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t(`battle.tile.${tile}`)}</div>
        <p style={{ fontSize: 13, fontStyle: 'italic', color: '#c9b88a', margin: '0 0 10px', lineHeight: 1.45 }}>
          {t(`battle.tile.${tile}_lore`)}
        </p>
        <p style={{ fontSize: 13, color: '#cdd4e0', margin: '0 0 14px', lineHeight: 1.4 }}>
          ⚙ {t(`battle.tile.${tile}_desc`)}
        </p>
        <button type="button" onClick={onClose} style={primaryBtn}>
          {t('battle.tile.close')}
        </button>
      </div>
    </div>
  )
}

function Footer({
  battle,
  busy,
  onEndTurn,
  onClose,
}: {
  battle: Battle
  busy: boolean
  onEndTurn: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  if (battle.over) {
    const won = battle.winner === 'attacker'
    const byPoints = battle.by_round_limit
    return (
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: won ? '#5ad17a' : '#e0884a', marginBottom: byPoints ? 4 : 8 }}>
          {byPoints ? (won ? t('battle.victoryPoints') : t('battle.defeatPoints')) : won ? t('battle.victory') : t('battle.defeat')}
        </div>
        {byPoints && <div style={{ fontSize: 12, color: '#9aa3b2', marginBottom: 8 }}>{t('battle.roundLimitNote')}</div>}
        <button onClick={onClose} style={primaryBtn}>
          {t('battle.backToMap')}
        </button>
      </div>
    )
  }
  return (
    <div style={{ marginTop: 12, textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: '#9aa3b2', margin: '0 0 8px' }}>{t('battle.hint')}</p>
      <button onClick={onEndTurn} disabled={busy} style={primaryBtn}>
        {busy ? t('battle.resolving') : t('battle.endTurn')}
      </button>
    </div>
  )
}

const pointerNone: CSSProperties = { pointerEvents: 'none', userSelect: 'none' }

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 50,
  background: 'rgba(8,10,15,0.86)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
}

const card: CSSProperties = {
  background: '#11141c',
  border: '1px solid #2a3140',
  borderRadius: 12,
  padding: 16,
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  maxWidth: '92vw',
}

const primaryBtn: CSSProperties = {
  padding: '9px 22px',
  fontSize: 15,
  borderRadius: 8,
  border: '1px solid #6c8ebf',
  background: '#2c3a5a',
  color: '#fff',
  cursor: 'pointer',
}

const legendItem: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  fontSize: 12,
  color: '#9aa3b2',
  background: 'transparent',
  border: '1px solid #2a3140',
  borderRadius: 999,
  cursor: 'pointer',
}

const tileInfoBackdrop: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  background: 'rgba(6,8,12,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const tileInfoCard: CSSProperties = {
  width: 320,
  maxWidth: '88vw',
  padding: 18,
  textAlign: 'center',
  background: '#161a24',
  border: '1px solid #3a3150',
  borderRadius: 12,
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
}
