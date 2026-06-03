import { useMemo } from 'react'
import { GameLayout } from '../../components/GameLayout'
import { HUDLayer } from '../../components/HUDLayer'
import { GameCanvas } from '../../game/GameCanvas'
import { Canvas2DRenderer } from '../../game/renderer/Canvas2DRenderer'
import { useCity } from '../../queries/useCity'
import { ResourceBar } from './components/ResourceBar'
import { BuildPalette } from './components/BuildPalette'
import { SelectedPanel } from './components/SelectedPanel'
import { ArmyPanel } from './components/ArmyPanel'
import { AccountControls } from '../../components/AccountControls'
import { ViewNav } from '../../components/ViewNav'
import { EditToggle } from '../../components/EditToggle'

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
        {city && <ArmyPanel city={city} />}
        <EditToggle />
        <ViewNav />
        <AccountControls style={{ position: 'absolute', bottom: 12, right: 16, pointerEvents: 'auto' }} />
      </HUDLayer>
    </GameLayout>
  )
}
