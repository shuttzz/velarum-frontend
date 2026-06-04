import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CatalogBuilding } from '../../../types/game'

// Bloco de descrição de um edifício: historinha (lore) + o que faz (⚙) + produção (📈, quando
// `def` é informado). Reutilizado no modal de construção e no modal do edifício construído.
export function BuildingInfo({ buildingKey, def }: { buildingKey: string; def?: CatalogBuilding }) {
  const { t } = useTranslation()
  // t() devolve a própria chave quando não há tradução — não renderiza nesse caso (evita
  // mostrar "buildingLore.x" cru para edifícios sem texto cadastrado).
  const loreKey = `buildingLore.${buildingKey}`
  const descKey = `buildingDesc.${buildingKey}`
  const loreText = t(loreKey)
  const descText = t(descKey)
  return (
    <div>
      {loreText !== loreKey && <p style={lore}>{loreText}</p>}
      {descText !== descKey && <p style={desc}>⚙ {descText}</p>}
      {def?.produces && def.base_rate > 0 && (
        <p style={desc}>📈 {t('build.produces', { rate: def.base_rate, res: t(`resources.${def.produces}`) })}</p>
      )}
    </div>
  )
}

const lore: CSSProperties = {
  fontSize: 13,
  fontStyle: 'italic',
  color: '#c9b88a',
  lineHeight: 1.45,
  margin: '0 0 8px',
}

const desc: CSSProperties = {
  fontSize: 13,
  color: '#cdd4e0',
  lineHeight: 1.4,
  margin: '0 0 6px',
}
