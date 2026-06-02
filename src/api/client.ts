// Cliente HTTP tipado. As chamadas vão para /api/* (proxy do Vite -> backend).
// Futuramente substituível pelo cliente gerado por oapi-codegen sem tocar nas queries.
import i18n from '../i18n'

const BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`)
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    // Envia o cookie de sessão (httpOnly) em toda chamada.
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body)
  }
  return res
}

export const api = {
  get: async <T>(path: string): Promise<T> => (await request(path)).json() as Promise<T>,
  post: async <T>(path: string, body: unknown): Promise<T> =>
    (await request(path, { method: 'POST', body: JSON.stringify(body) })).json() as Promise<T>,
  // POST que não retorna corpo (ex: 204 No Content).
  postVoid: async (path: string, body: unknown): Promise<void> => {
    await request(path, { method: 'POST', body: JSON.stringify(body) })
  },
}

// Traduz um erro para mensagem amigável. O backend manda { code, error }: usamos o `code`
// como chave de tradução (i18n) e caímos no `error` (fallback pt do servidor) ou em
// 'errors.network' quando não há resposta (falha de conexão). Cf. memory i18n-arquitetura.
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.body && typeof e.body === 'object') {
    const body = e.body as { code?: string; error?: string }
    if (body.code) {
      const key = `errors.${body.code}`
      const translated = i18n.t(key)
      if (translated !== key) return translated
    }
    if (body.error) return body.error
  }
  return i18n.t('errors.network')
}
