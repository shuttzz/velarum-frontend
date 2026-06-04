// Espelho (estável) da geometria das regiões do mundo — bate com config.WorldRegions do backend.
// Usado só para desenhar a "visão Mundo" (divisões + rótulos). Coords de mundo (axial).
export const WORLD_REGIONS: { key: string; cx: number; cy: number }[] = [
  { key: 'campos_da_aurora', cx: 35, cy: 35 },
  { key: 'ermo_cinereo', cx: -35, cy: 35 },
  { key: 'litoral_partido', cx: -35, cy: -35 },
  { key: 'planalto_runico', cx: 35, cy: -35 },
]
