import { useMemo } from 'react'
import { GameLayout } from '../../components/GameLayout'
import { HUDLayer } from '../../components/HUDLayer'
import { GameCanvas } from '../../game/GameCanvas'
import { Canvas2DRenderer } from '../../game/renderer/Canvas2DRenderer'
import { useCity } from '../../queries/useCity'
import { ResourceBar } from './components/ResourceBar'
import { BuildPalette } from './components/BuildPalette'
import { SelectedPanel } from './components/SelectedPanel'
import { AccountControls } from '../../components/AccountControls'

// Tela da cidade: canvas fullscreen + HUD sobreposto. O renderer é injetado (Canvas2D hoje,
// PixiJS depois — mesma interface IRenderer).
export function CityView({ cityId }: { cityId: string }) {
  const renderer = useMemo(() => new Canvas2DRenderer(), [])
  const { data: city } = useCity(cityId)

  return (
    <GameLayout>
      <GameCanvas cityId={cityId} renderer={renderer} />
      <HUDLayer>
        {city && <ResourceBar city={city} />}
        {city && <BuildPalette city={city} />}
        {city && <SelectedPanel city={city} />}
        <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
      </HUDLayer>
    </GameLayout>
  )
}
