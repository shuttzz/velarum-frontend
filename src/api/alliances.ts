import { api } from './client'
import type { Alliance, MyAlliance } from '../types/game'

export const alliancesApi = {
  list: () => api.get<Alliance[]>('/alliances'),
  mine: () => api.get<MyAlliance>('/alliances/mine'),
  create: (body: { name: string; tag: string }) => api.post<MyAlliance>('/alliances', body),
  join: (id: string) => api.post<{ result: string }>(`/alliances/${id}/join`, {}),
  decide: (requestId: string, approve: boolean) => api.postVoid(`/alliances/requests/${requestId}/decide`, { approve }),
  leave: () => api.postVoid('/alliances/leave', {}),
  kick: (playerId: string) => api.postVoid('/alliances/kick', { player_id: playerId }),
  setEntryMode: (mode: 'open' | 'approval') => api.postVoid('/alliances/entry-mode', { mode }),
  setRole: (playerId: string, role: string) => api.postVoid('/alliances/role', { player_id: playerId, role }),
  transfer: (playerId: string) => api.postVoid('/alliances/transfer', { player_id: playerId }),
  disband: () => api.postVoid('/alliances/disband', {}),
}
