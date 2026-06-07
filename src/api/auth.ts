import { api } from './client'

export type Account = { id: string; username: string; email: string; premium: number }

export const authApi = {
  me: () => api.get<Account>('/auth/me'),
  login: (body: { email: string; password: string }) => api.post<Account>('/auth/login', body),
  register: (body: { username: string; email: string; password: string }) =>
    api.post<Account>('/auth/register', body),
  logout: () => api.postVoid('/auth/logout', {}),
}
