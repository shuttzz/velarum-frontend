// Previsão de combate auto-resolve — ESPELHA internal/domain/combat.AutoResolve do backend (puro,
// determinístico). Como o combate não tem aleatoriedade, dá pra mostrar o resultado EXATO das
// tropas selecionadas antes de enviar — o jogador não vai às cegas. Além do desfecho (vitória/
// derrota) exibimos um TIER qualitativo (margem) p/ leitura rápida do risco.
// Manter em sincronia com a fórmula do backend (mesma aritmética inteira / floor).

export type UnitStat = { attack: number; hp: number }

// Tier de leitura rápida (do melhor ao pior). Derivado da MARGEM, já que o desfecho é determinístico:
//  - vitória: fração do exército perdida (0 = dominante; pouca = limpa; muita = vitória de Pirro)
//  - derrota: quanto da defesa o exército arranha antes de morrer.
export type Tier = 'certain_win' | 'win' | 'risky' | 'no_chance' | 'suicide'

export type Prediction = {
  attackerWins: boolean
  tier: Tier
  survivors: Record<string, number>
  losses: Record<string, number>
  totalSurvivors: number
  totalLosses: number
}

function ceilDiv(a: number, b: number): number {
  if (b <= 0) return 0
  return Math.floor((a + b - 1) / b)
}

// predictAutoResolve recebe as tropas {unit_type: count}, um lookup de stats (do catálogo) e a
// defesa agregada do alvo. Retorna o desfecho determinístico + tier de risco.
export function predictAutoResolve(
  troops: Record<string, number>,
  stat: (unitType: string) => UnitStat | undefined,
  def: { attack: number; hp: number },
): Prediction {
  const stacks: { key: string; attack: number; hp: number; count: number }[] = []
  let totalAtk = 0
  let totalHP = 0
  let totalSent = 0
  for (const [key, count] of Object.entries(troops)) {
    if (count <= 0) continue
    const u = stat(key)
    if (!u) continue
    stacks.push({ key, attack: u.attack, hp: u.hp, count })
    totalAtk += u.attack * count
    totalHP += u.hp * count
    totalSent += count
  }

  const survivors: Record<string, number> = {}
  const losses: Record<string, number> = {}

  // Sem poder de ataque ou sem exército → derrota total.
  if (totalAtk <= 0 || totalHP <= 0) {
    for (const s of stacks) {
      survivors[s.key] = 0
      losses[s.key] = s.count
    }
    return build(false, survivors, losses, totalSent, 0, 0, def.hp)
  }

  const roundsToKillDef = ceilDiv(def.hp, totalAtk)
  const roundsToKillAtk = ceilDiv(totalHP, Math.max(def.attack, 1))
  const attackerWins = roundsToKillDef <= roundsToKillAtk

  let dmgToAtk = attackerWins ? roundsToKillDef * def.attack : totalHP
  if (dmgToAtk > totalHP) dmgToAtk = totalHP

  for (const s of stacks) {
    const stackHP = s.hp * s.count
    const stackDmg = Math.floor((dmgToAtk * stackHP) / totalHP) // proporcional ao HP do stack
    let killed = Math.floor(stackDmg / s.hp)
    if (killed > s.count) killed = s.count
    survivors[s.key] = s.count - killed
    losses[s.key] = killed
  }
  return build(attackerWins, survivors, losses, totalSent, roundsToKillAtk, totalAtk, def.hp)
}

function build(
  attackerWins: boolean,
  survivors: Record<string, number>,
  losses: Record<string, number>,
  totalSent: number,
  roundsToKillAtk: number,
  totalAtk: number,
  defHp: number,
): Prediction {
  const totalSurvivors = Object.values(survivors).reduce((a, b) => a + b, 0)
  const totalLosses = Object.values(losses).reduce((a, b) => a + b, 0)
  return { attackerWins, tier: tierOf(attackerWins, totalSent, totalLosses, roundsToKillAtk, totalAtk, defHp), survivors, losses, totalSurvivors, totalLosses }
}

function tierOf(attackerWins: boolean, totalSent: number, totalLosses: number, roundsToKillAtk: number, totalAtk: number, defHp: number): Tier {
  if (totalSent <= 0) return 'suicide'
  if (attackerWins) {
    const lossFrac = totalLosses / totalSent
    if (lossFrac <= 0) return 'certain_win'
    if (lossFrac <= 0.2) return 'win'
    return 'risky'
  }
  // Derrota: quanto da defesa o exército arranha antes de ser aniquilado.
  const dealt = roundsToKillAtk * totalAtk
  const fracDef = defHp > 0 ? dealt / defHp : 0
  return fracDef >= 0.5 ? 'no_chance' : 'suicide'
}
