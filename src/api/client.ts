// Cliente HTTP tipado. As chamadas vão para /api/* (proxy do Vite -> backend).
// Futuramente substituível pelo cliente gerado por oapi-codegen sem tocar nas queries.
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

// Extrai a mensagem de erro amigável de um erro (ApiError do backend traz {error}).
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'error' in e.body) {
    return String((e.body as { error: unknown }).error)
  }
  return e instanceof Error ? e.message : String(e)
}
