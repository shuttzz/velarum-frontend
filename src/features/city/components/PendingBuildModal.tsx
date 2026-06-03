import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { City } from '../../../types/game'
import { Modal } from '../../../components/Modal'
import { useGameUIStore } from '../../../stores/useGameUIStore'
import { useCityActions } from '../../../queries/useGameMutations'
import { formatDuration } from '../catalog'
import { useNow, secondsUntil } from '../../../lib/useNow'
import { buildingColor } from '../buildingVisual'

// Modal de uma CONSTRUÇÃO NOVA em andamento (abre ao clicar na obra no canvas): mostra o que
// está sendo construído + contador + cancelar (devolve recursos).
export function PendingBuildModal({ city }: { city: City }) {
  const { t } = useTranslation()
  const selectedPendingId = useGameUIStore((s) => s.selectedPendingId)
  const selectPending = useGameUIStore((s) => s.selectPending)
  const { cancel } = useCityActions(city.id)
  const now = useNow()

  const p = city.pending.find((x) => x.id === selectedPendingId && !x.is_upgrade)
  if (!p) return null

  return (
    <Modal title={t(`buildings.${p.building_type}`)} onClose={() => selectPending(null)} width={300}>
      <div style={{ ...thumb, background: buildingColor(p.building_type) }} />
      <div style={{ color: '#e0b04a', fontSize: 13, marginTop: 10 }}>
        {t('selected.constructing', { time: formatDuration(secondsUntil(p.finish_at, now)) })}
      </div>
      <button
        onClick={() => cancel.mutate(p.id, { onSuccess: () => selectPending(null) })}
        disabled={cancel.isPending}
        style={cancelBtn}
      >
        {cancel.isPending ? t('selected.cancelling') : t('selected.cancel')}
      </button>
    </Modal>
  )
}

const thumb: CSSProperties = {
  width: '100%',
  aspectRatio: '2 / 1',
  borderRadius: 8,
}

const cancelBtn: CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '8px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #7a4a4a',
  background: '#3a2626',
  color: '#fff',
  cursor: 'pointer',
}
