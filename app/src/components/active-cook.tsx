import { useCookStore } from '@/stores/cook-store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Target,
  ThermometerSun,
  X,
} from 'lucide-react'

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  heating: { label: 'Heating', color: 'bg-blue-500/20 text-blue-400' },
  approaching_pull: { label: 'Approaching', color: 'bg-amber-500/20 text-amber-400' },
  pull_now: { label: 'Pull Now!', color: 'bg-red-500/20 text-red-400' },
  resting: { label: 'Resting', color: 'bg-purple-500/20 text-purple-400' },
  done: { label: 'Done', color: 'bg-green-500/20 text-green-400' },
  overshot: { label: 'Overshot', color: 'bg-red-500/20 text-red-400' },
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return '--'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  if (min >= 60) {
    const hr = Math.floor(min / 60)
    const rm = min % 60
    return `${hr}h ${rm}m`
  }
  return sec > 0 ? `${min}m ${sec}s` : `${min} min`
}

export function ActiveCook() {
  const frame = useCookStore((s) => s.frame)
  const config = useCookStore((s) => s.config)
  const stopCook = useCookStore((s) => s.stopCook)

  if (!config || !frame) {
    return (
      <Card className="flex items-center justify-center p-8">
        <span className="text-sm text-muted-foreground">
          Waiting for probe data...
        </span>
      </Card>
    )
  }

  const stateInfo = STATE_LABELS[frame.state] ?? STATE_LABELS.heating
  const hasSafety = frame.safety.some((s) => s.binding)

  return (
    <div className="flex flex-col gap-3">
      {/* Cook info bar */}
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.profile.label}</span>
          <Badge variant="secondary">{config.doneness.label}</Badge>
          <Badge className={stateInfo.color}>{stateInfo.label}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={stopCook}>
          <X className="h-4 w-4" />
        </Button>
      </Card>

      {/* Advice */}
      {frame.advice && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-amber-300">{frame.advice}</p>
        </Card>
      )}

      {/* Targets */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            Target
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {frame.targetCoreC}°C
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ThermometerSun className="h-3 w-3" />
            Pull at
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {frame.pullCoreC.toFixed(1)}°C
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            ETA
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {formatEta(frame.etaToPullS)}
          </div>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="p-3">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{config.doneness.textureWindowC[0]}°C</span>
          <span>Texture window</span>
          <span>{config.doneness.textureWindowC[1]}°C</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${Math.min(100, frame.textureWindowPosition * 100)}%` }}
          />
        </div>
      </Card>

      {/* Safety (only for ground/poultry with binding pathogens) */}
      {hasSafety && (
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {frame.allSafetySatisfied ? (
              <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            )}
            Pathogen Safety
          </div>
          <div className="space-y-2">
            {frame.safety
              .filter((s) => s.binding)
              .map((s) => {
                const pct = s.logReductionRequired > 0
                  ? Math.min(100, (s.logReductionAccumulated / s.logReductionRequired) * 100)
                  : 100
                return (
                  <div key={s.pathogenId}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.pathogenName}</span>
                      <span className="tabular-nums">
                        {s.logReductionAccumulated.toFixed(1)} / {s.logReductionRequired} log
                      </span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                          s.satisfied ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Warnings */}
      {frame.warnings.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5 p-3">
          {frame.warnings.map((w) => (
            <p key={w} className="text-xs text-red-400">
              {w === 'probe_suspect' && 'Probe may have moved. Check placement.'}
            </p>
          ))}
        </Card>
      )}
    </div>
  )
}
