import { useProbeStore } from '@/stores/probe-store'
import { Card } from '@/components/ui/card'
import { Flame, TrendingUp, Timer, Hash } from 'lucide-react'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}m ${sec.toString().padStart(2, '0')}s`
}

export function MetricsBar() {
  const peakTemp = useProbeStore((s) => s.peakTemp)
  const ratePerMin = useProbeStore((s) => s.ratePerMin)
  const readings = useProbeStore((s) => s.readings)
  const startTime = useProbeStore((s) => s.startTime)

  const elapsed = startTime ? Date.now() - startTime : 0

  const metrics = [
    {
      icon: Flame,
      label: 'Peak',
      value: peakTemp !== null ? `${peakTemp.toFixed(1)}°` : '--',
    },
    {
      icon: TrendingUp,
      label: 'Rate',
      value: ratePerMin !== null ? `${ratePerMin >= 0 ? '+' : ''}${ratePerMin.toFixed(1)}/min` : '--',
    },
    {
      icon: Hash,
      label: 'Readings',
      value: readings.length.toLocaleString(),
    },
    {
      icon: Timer,
      label: 'Duration',
      value: startTime ? formatDuration(elapsed) : '--',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label} className="gap-1 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <m.icon className="h-3 w-3" />
            {m.label}
          </div>
          <div className="text-lg font-semibold tabular-nums">{m.value}</div>
        </Card>
      ))}
    </div>
  )
}
