// Cor placeholder por edifício (no lugar do sprite). Usada no "slot de imagem" dos cards de
// construção; quando houver arte, troca-se o bloco colorido por <img>. Espelha o renderer.
const COLORS: Record<string, string> = {
  lar_do_cla: '#cba14b',
  viveiro_de_pedra: '#8a8d91',
  fogueira_comunal: '#e0663b',
  pedra_da_memoria: '#6c8ebf',
  celeiro_de_argila: '#b5651d',
  canteiro_de_almas: '#9c3b3b',
  altar_das_fogueiras: '#c98f3a',
  torre_do_vigia: '#7a8a99',
  circulo_runico: '#7b6cbf',
  praca_do_conselho: '#5aa0a0',
  pira_dos_guerreiros: '#b3472d',
  marco_primeiros_fogos: '#d4af37',
}

export function buildingColor(key: string): string {
  return COLORS[key] ?? '#555b6e'
}
