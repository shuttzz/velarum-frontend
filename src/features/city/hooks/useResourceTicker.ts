import { useEffect, useRef, useState } from 'react'
import type { Amounts, City } from '../../../types/game'
import { extrapolate } from '../../../lib/resourceExtrapolator'

// Anima os recursos localmente entre snapshots do servidor. Recalibra ao chegar novo `city`.
export function useResourceTicker(city: City | undefined): Amounts | null {
  const snap = useRef<{ base: Amounts; rate: Amounts; cap: Amounts; at: number } | null>(null)
  const [value, setValue] = useState<Amounts | null>(null)

  useEffect(() => {
    if (city) snap.current = { base: city.resources, rate: city.rate, cap: city.capacity, at: Date.now() }
  }, [city])

  useEffect(() => {
    const t = setInterval(() => {
      const s = snap.current
      if (s) setValue(extrapolate(s.base, s.rate, s.cap, Date.now() - s.at))
    }, 250)
    return () => clearInterval(t)
  }, [])

  return value
}
