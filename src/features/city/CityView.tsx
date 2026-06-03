import { useMemo } from 'react'
import { GameLayout } from '../../components/GameLayout'
import { HUDLayer } from '../../components/HUDLayer'
import { GameCanvas } from '../../game/GameCanvas'
import { Canvas2DRenderer } from '../../game/renderer/Canvas2DRenderer'
import { useCity } from '../../queries/useCity'
import { ResourceBar } from './components/ResourceBar'
import { BuildingModal } from './components/BuildingModal'
import { CityToolbar } from './components/CityToolbar'
import { AccountControls } from '../../components/AccountControls'

// Tela da cidade: canvas fullscreen + HUD sobreposto. Interações por MODAIS (construir, detalhe
// do edifício/recrutar) em vez de painéis fixos. O renderer é injetado (Canvas2D hoje, PixiJS depois).
export function CityView({ cityId }: { cityId: string }) {
  const renderer = useMemo(() => new Canvas2DRenderer(), [])
  const { data: city } = useCity(cityId)

  return (
    <GameLayout>
      <GameCanvas cityId={cityId} renderer={renderer} />
      <HUDLayer>
        {city && <ResourceBar city={city} />}
        {city && <CityToolbar city={city} />}
        {city && <BuildingModal city={city} />}
        <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
      </HUDLayer>
    </GameLayout>
  )
}
