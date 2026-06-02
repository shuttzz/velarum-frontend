// Query keys centralizadas — evita strings mágicas e invalidação errada.
export const queryKeys = {
  city: (cityId: string) => ['city', cityId] as const,
  catalog: ['catalog'] as const,
  me: ['auth', 'me'] as const,
}
