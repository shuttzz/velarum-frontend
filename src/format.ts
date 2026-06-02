// Formatação de quantidades de recurso para exibição (pt-BR).
export function formatAmount(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.floor(n))
}
