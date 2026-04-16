import { create } from 'zustand'
import { CookEngine, type CookFrame, type CookConfig } from '@/lib/cook-engine'
import {
  type MeatProfile,
  type DonenessLevel,
  type CookMethod,
} from '@/lib/meat-profiles'
import { useProbeStore } from './probe-store'

interface CookStore {
  // Config
  isActive: boolean
  config: CookConfig | null
  engine: CookEngine | null

  // Live frame
  frame: CookFrame | null

  // Actions
  startCook: (
    profile: MeatProfile,
    doneness: DonenessLevel,
    cookMethod: CookMethod,
    thicknessM?: number,
    restTented?: boolean,
  ) => void
  stopCook: () => void
}

let unsubscribeProbe: (() => void) | null = null

export const useCookStore = create<CookStore>((set, get) => ({
  isActive: false,
  config: null,
  engine: null,
  frame: null,

  startCook: (profile, doneness, cookMethod, thicknessM, restTented) => {
    // Clean up previous subscription
    if (unsubscribeProbe) {
      unsubscribeProbe()
      unsubscribeProbe = null
    }

    const config: CookConfig = {
      profile,
      doneness,
      thicknessM: thicknessM ?? profile.defaultThicknessM,
      cookMethod,
      restTented: restTented ?? true,
      restEnvironmentC: 22,
      ambientC: cookMethod === 'oven' ? 180 : cookMethod === 'grill' ? 200 : 150,
    }

    const engine = new CookEngine(config)

    // Clear probe readings for fresh session
    useProbeStore.getState().clearReadings()

    set({ isActive: true, config, engine, frame: null })

    // Subscribe to probe readings
    let lastReadingCount = 0
    unsubscribeProbe = useProbeStore.subscribe((state) => {
      const { readings } = state
      if (readings.length === lastReadingCount) return
      lastReadingCount = readings.length

      const eng = get().engine
      if (!eng || readings.length === 0) return

      const latest = readings[readings.length - 1]
      const frame = eng.ingest(latest.ts / 1000, latest.tempC)
      set({ frame })
    })
  },

  stopCook: () => {
    if (unsubscribeProbe) {
      unsubscribeProbe()
      unsubscribeProbe = null
    }
    set({ isActive: false, config: null, engine: null, frame: null })
  },
}))
