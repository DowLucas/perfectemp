import { useState } from 'react'
import { useCookStore } from '@/stores/cook-store'
import { useProbeStore } from '@/stores/probe-store'
import { MEAT_PROFILES, type CookMethod } from '@/lib/meat-profiles'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, ChevronRight } from 'lucide-react'

const COOK_METHODS: { id: CookMethod; label: string }[] = [
  { id: 'grill', label: 'Grill' },
  { id: 'pan', label: 'Pan' },
  { id: 'oven', label: 'Oven' },
  { id: 'smoker', label: 'Smoker' },
  { id: 'sous_vide', label: 'Sous Vide' },
  { id: 'braise', label: 'Braise' },
]

export function CookSetup() {
  const startCook = useCookStore((s) => s.startCook)
  const connectionState = useProbeStore((s) => s.connectionState)
  const isConnected = connectionState === 'connected'

  const [step, setStep] = useState<'meat' | 'doneness' | 'method'>('meat')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [selectedDonenessId, setSelectedDonenessId] = useState<string | null>(null)

  const selectedProfile = MEAT_PROFILES.find((p) => p.id === selectedProfileId)

  function handleStartCook(methodId: CookMethod) {
    if (!selectedProfile || !selectedDonenessId) return
    const doneness = selectedProfile.doneness.find((d) => d.id === selectedDonenessId)
    if (!doneness) return
    startCook(selectedProfile, doneness, methodId)
  }

  function reset() {
    setStep('meat')
    setSelectedProfileId(null)
    setSelectedDonenessId(null)
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Flame className="h-4 w-4 text-amber-400" />
        Start a Cook
      </div>

      {/* Step 1: Select meat */}
      {step === 'meat' && (
        <div className="grid grid-cols-2 gap-2">
          {MEAT_PROFILES.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              className="h-auto justify-start px-3 py-2.5 text-left"
              onClick={() => {
                setSelectedProfileId(p.id)
                setStep('doneness')
              }}
            >
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {p.cutClass.replace('_', ' ')}
                </div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}

      {/* Step 2: Select doneness */}
      {step === 'doneness' && selectedProfile && (
        <div>
          <button
            onClick={reset}
            className="mb-3 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to meat selection
          </button>
          <div className="mb-2 text-sm text-muted-foreground">
            {selectedProfile.label} — choose doneness:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProfile.doneness.map((d) => (
              <Button
                key={d.id}
                variant="outline"
                className="h-auto px-3 py-2"
                onClick={() => {
                  setSelectedDonenessId(d.id)
                  setStep('method')
                }}
              >
                <div className="text-left">
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {d.targetCoreC}°C
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select cook method */}
      {step === 'method' && selectedProfile && selectedDonenessId && (
        <div>
          <button
            onClick={() => setStep('doneness')}
            className="mb-3 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to doneness
          </button>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            {selectedProfile.label}
            <Badge variant="secondary">
              {selectedProfile.doneness.find((d) => d.id === selectedDonenessId)?.label}
            </Badge>
          </div>
          <div className="mb-3 text-sm text-muted-foreground">
            How are you cooking?
          </div>
          <div className="grid grid-cols-3 gap-2">
            {COOK_METHODS.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                disabled={!isConnected}
                onClick={() => handleStartCook(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </div>
          {!isConnected && (
            <p className="mt-2 text-xs text-muted-foreground">
              Connect probe first to start cooking.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
