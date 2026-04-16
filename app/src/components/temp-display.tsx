import { useProbeStore } from '@/stores/probe-store'
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react'

function tempColor(tempC: number): string {
  if (tempC < 20) return 'text-blue-400'
  if (tempC < 40) return 'text-foreground'
  if (tempC < 70) return 'text-amber-400'
  return 'text-red-400'
}

export function TempDisplay() {
  const smoothedTemp = useProbeStore((s) => s.smoothedTemp)
  const ratePerMin = useProbeStore((s) => s.ratePerMin)
  const connectionState = useProbeStore((s) => s.connectionState)

  if (connectionState !== 'connected' && smoothedTemp === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-7xl font-bold tracking-tighter text-muted-foreground/30 tabular-nums">
          --.-
        </span>
        <span className="mt-2 text-sm text-muted-foreground">
          Connect probe to start
        </span>
      </div>
    )
  }

  const displayTemp = smoothedTemp !== null ? smoothedTemp.toFixed(1) : '--.-'
  const color = smoothedTemp !== null ? tempColor(smoothedTemp) : 'text-muted-foreground'

  let RateIcon = ArrowRight
  let rateColor = 'text-muted-foreground'
  if (ratePerMin !== null) {
    if (ratePerMin > 0.1) {
      RateIcon = ArrowUp
      rateColor = 'text-amber-400'
    } else if (ratePerMin < -0.1) {
      RateIcon = ArrowDown
      rateColor = 'text-blue-400'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex items-baseline gap-1">
        <span className={`text-7xl font-bold tracking-tighter tabular-nums transition-colors duration-500 ${color}`}>
          {displayTemp}
        </span>
        <span className="text-2xl font-light text-muted-foreground">°C</span>
      </div>
      {ratePerMin !== null && (
        <div className={`mt-2 flex items-center gap-1 text-sm ${rateColor}`}>
          <RateIcon className="h-3.5 w-3.5" />
          <span>{Math.abs(ratePerMin).toFixed(1)} °C/min</span>
        </div>
      )}
    </div>
  )
}
