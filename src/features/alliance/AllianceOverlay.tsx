import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/Modal'
import { useMe } from '../../queries/useAuth'
import { useMyAlliance, useAlliances, useAllianceActions } from '../../queries/useAlliance'
import { errorMessage } from '../../api/client'
import type { Alliance, MyAlliance } from '../../types/game'

const CREATE_COST = 300

function rank(role: string): number {
  return role === 'owner' ? 3 : role === 'leader' ? 2 : role === 'officer' ? 1 : 0
}

// Overlay de Alianças: botão flutuante + modal (criar/navegar quando sem aliança; gerir quando dentro).
export function AllianceOverlay() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const mine = useMyAlliance(open)
  const inAlliance = !!mine.data

  return (
    <>
      <button onClick={() => setOpen(true)} style={fab} aria-label={t('alliance.title')}>
        🛡
      </button>
      {open && (
        <Modal title={t('alliance.title')} onClose={() => setOpen(false)} width={460}>
          {mine.isLoading ? (
            <p style={dim}>{t('common.loading')}</p>
          ) : inAlliance ? (
            <Manage mine={mine.data as MyAlliance} />
          ) : (
            <Browse />
          )}
        </Modal>
      )}
    </>
  )
}

// Sem aliança: saldo premium + criar + lista para entrar.
function Browse() {
  const { t } = useTranslation()
  const me = useMe()
  const list = useAlliances(true)
  const { create, join } = useAllianceActions()
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const premium = me.data?.premium ?? 0

  return (
    <div>
      <div style={{ fontSize: 13, color: '#9aa3b2', marginBottom: 8 }}>
        🔮 {t('alliance.premium', { n: premium })}
      </div>
      <div style={card}>
        <strong style={{ fontSize: 13 }}>{t('alliance.create')}</strong>
        <input style={input} placeholder={t('alliance.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        <input style={input} placeholder={t('alliance.tag')} value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} maxLength={5} />
        <button
          style={primaryBtn}
          disabled={create.isPending || premium < CREATE_COST || name.trim().length < 3 || tag.trim().length < 2}
          onClick={() => create.mutate({ name: name.trim(), tag: tag.trim() })}
        >
          {t('alliance.createFor', { cost: CREATE_COST })}
        </button>
        {create.isError && <p style={err}>{errorMessage(create.error)}</p>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '12px 0 6px' }}>{t('alliance.browse')}</div>
      {(list.data ?? []).length === 0 ? (
        <p style={dim}>{t('alliance.none')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(list.data ?? []).map((a: Alliance) => (
            <div key={a.id} style={row}>
              <span>
                <strong>[{a.tag}]</strong> {a.name}{' '}
                <span style={{ color: '#6b7280' }}>
                  {a.members}/{a.member_cap}
                </span>
              </span>
              <button style={smallBtn} disabled={join.isPending} onClick={() => join.mutate(a.id)}>
                {a.entry_mode === 'open' ? t('alliance.join') : t('alliance.request')}
              </button>
            </div>
          ))}
        </div>
      )}
      {join.isError && <p style={err}>{errorMessage(join.error)}</p>}
    </div>
  )
}

// Dentro da aliança: roster, papéis, pedidos (oficial+), modo de entrada, sair/dissolver.
function Manage({ mine }: { mine: MyAlliance }) {
  const { t } = useTranslation()
  const { decide, leave, kick, setEntryMode, setRole, transfer, disband } = useAllianceActions()
  const myRank = rank(mine.my_role)
  const a = mine.alliance
  const canManage = myRank >= 1 // oficial+
  const canLead = myRank >= 2 // líder+
  const isOwner = mine.my_role === 'owner'

  return (
    <div>
      <div style={{ fontWeight: 600 }}>
        [{a.tag}] {a.name}
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b2' }}>
        {t('alliance.membersOf', { n: a.members, cap: a.member_cap })} · {t(`alliance.role.${mine.my_role}`)}
      </div>

      {canLead && (
        <div style={{ fontSize: 12, marginTop: 8 }}>
          {t('alliance.entryMode')}:{' '}
          <button style={a.entry_mode === 'open' ? chipOn : chip} onClick={() => setEntryMode.mutate('open')}>
            {t('alliance.open')}
          </button>{' '}
          <button style={a.entry_mode === 'approval' ? chipOn : chip} onClick={() => setEntryMode.mutate('approval')}>
            {t('alliance.approval')}
          </button>
        </div>
      )}

      {canManage && mine.requests.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong style={{ fontSize: 13 }}>{t('alliance.requests')}</strong>
          {mine.requests.map((r) => (
            <div key={r.id} style={row}>
              <span>{r.username}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                <button style={okBtn} onClick={() => decide.mutate({ requestId: r.id, approve: true })}>
                  ✓
                </button>
                <button style={smallBtn} onClick={() => decide.mutate({ requestId: r.id, approve: false })}>
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <strong style={{ fontSize: 13 }}>{t('alliance.members')}</strong>
        {mine.members.map((m) => {
          const targetRank = rank(m.role)
          const manageable = canLead && targetRank < myRank && m.role !== 'owner'
          const assignable = isOwner ? ['member', 'officer', 'leader'] : ['member', 'officer']
          return (
            <div key={m.player_id} style={row}>
              <span>
                {m.username} <span style={{ color: '#6b7280', fontSize: 11 }}>· {t(`alliance.role.${m.role}`)}</span>
              </span>
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {manageable && (
                  <select value={m.role} onChange={(e) => setRole.mutate({ playerId: m.player_id, role: e.target.value })} style={select}>
                    {assignable.map((r) => (
                      <option key={r} value={r}>
                        {t(`alliance.role.${r}`)}
                      </option>
                    ))}
                  </select>
                )}
                {canManage && targetRank < myRank && m.role !== 'owner' && (
                  <button style={smallBtn} onClick={() => kick.mutate(m.player_id)}>
                    {t('alliance.kick')}
                  </button>
                )}
                {isOwner && m.role !== 'owner' && (
                  <button
                    style={smallBtn}
                    onClick={() => {
                      if (window.confirm(t('alliance.transferConfirm', { name: m.username }))) transfer.mutate(m.player_id)
                    }}
                  >
                    {t('alliance.transfer')}
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {isOwner ? (
          <button style={dangerBtn} onClick={() => disband.mutate()}>
            {t('alliance.disband')}
          </button>
        ) : (
          <button style={dangerBtn} onClick={() => leave.mutate()}>
            {t('alliance.leave')}
          </button>
        )}
      </div>
      {(decide.isError || kick.isError || setRole.isError || setEntryMode.isError || leave.isError || transfer.isError || disband.isError) && (
        <p style={err}>{errorMessage(decide.error ?? kick.error ?? setRole.error ?? setEntryMode.error ?? leave.error ?? transfer.error ?? disband.error)}</p>
      )}
    </div>
  )
}

const fab: CSSProperties = {
  position: 'fixed',
  bottom: 56,
  right: 68,
  width: 44,
  height: 44,
  borderRadius: 22,
  border: '1px solid #4a5570',
  background: 'rgba(34,40,56,0.95)',
  color: '#fff',
  fontSize: 20,
  cursor: 'pointer',
  pointerEvents: 'auto',
  zIndex: 50,
}
const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: '#1a1f2b', border: '1px solid #2a3142', borderRadius: 8 }
const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginTop: 4, background: '#1a1f2b', border: '1px solid #2a3142', borderRadius: 8, fontSize: 13 }
const input: CSSProperties = { padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #39415a', background: '#11141c', color: '#fff' }
const select: CSSProperties = { padding: '3px 4px', fontSize: 11, borderRadius: 6, border: '1px solid #39415a', background: '#11141c', color: '#fff' }
const primaryBtn: CSSProperties = { padding: '8px', fontSize: 13, borderRadius: 8, border: '1px solid #6c8ebf', background: '#2c3a5a', color: '#fff', cursor: 'pointer' }
const smallBtn: CSSProperties = { padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #4a5570', background: '#2a3142', color: '#cdd5e3', cursor: 'pointer' }
const okBtn: CSSProperties = { ...smallBtn, border: '1px solid #4a7a55', color: '#7fd99b' }
const chip: CSSProperties = { ...smallBtn }
const chipOn: CSSProperties = { ...smallBtn, border: '1px solid #6c8ebf', background: '#2c3a5a', color: '#fff' }
const dangerBtn: CSSProperties = { padding: '6px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #9f5a5a', background: '#4a2c2c', color: '#fff', cursor: 'pointer' }
const dim: CSSProperties = { fontSize: 13, color: '#6b7280' }
const err: CSSProperties = { fontSize: 12, color: '#e0884a', margin: '6px 0 0' }
