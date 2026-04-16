/**
 * PerfecTemp Cook Engine
 *
 * Pure computational core: given a meat profile, doneness, and 1 Hz probe
 * telemetry, computes pull temperature, ETA, and pathogen safety ledger.
 *
 * Scientific basis documented in COOK_ENGINE.md.
 */

import {
  type MeatProfile,
  type DonenessLevel,
  type CookMethod,
  type PathogenKinetics,
  getPathogen,
} from './meat-profiles'

// ── Types ─────────────────────────────────────────────────────────

export type CookState =
  | 'heating'
  | 'approaching_pull'
  | 'pull_now'
  | 'resting'
  | 'done'
  | 'overshot'

export interface SafetyEntry {
  pathogenId: string
  pathogenName: string
  logReductionAccumulated: number
  logReductionRequired: number
  surfaceCredited: boolean
  binding: boolean
  satisfied: boolean
}

export interface CookFrame {
  tS: number
  probeC: number
  filteredC: number
  rateCPerMin: number

  targetCoreC: number
  pullCoreC: number
  etaToPullS: number | null
  projectedPeakC: number

  textureWindowPosition: number // 0..1 within texture window

  safety: SafetyEntry[]
  allSafetySatisfied: boolean

  state: CookState
  advice: string
  warnings: string[]
}

export interface CookConfig {
  profile: MeatProfile
  doneness: DonenessLevel
  thicknessM: number
  cookMethod: CookMethod
  restTented: boolean
  restEnvironmentC: number
  ambientC: number
}

// ── Constants ─────────────────────────────────────────────────────

const MAX_PHYSICAL_RATE_C_PER_S = 0.5
const NOISE_MARGIN_C = 1.0
const EMA_TAU_S = 8.0
const RATE_SMOOTHING_TAU_S = 15.0
const MIN_SAFETY_TEMP_C = 48.0
const APPROACHING_PULL_HORIZON_S = 120
const OVERSHOOT_TOLERANCE_C = 2.0
const MIN_RATE_FOR_ETA = 0.05 // °C/min
const REST_DONE_RATE_THRESHOLD = 0.1 // °C/min
const REST_DONE_MIN_DURATION_S = 60

// Surface temperature estimates by cook method
const SURFACE_TEMP_ESTIMATES: Record<string, number> = {
  oven: 150,
  grill: 200,
  pan: 180,
  smoker: 120,
  braise: 95,
  sous_vide: 0, // handled separately
}

// ── Engine ─────────────────────────────────────────────────────────

export class CookEngine {
  private config: CookConfig
  private pathogens: PathogenKinetics[]

  // State
  private tS = 0
  private filteredC: number | null = null
  private rateCPerMin = 0
  private logReductions: Map<string, number> = new Map()
  private lastSampleT: number | null = null
  private probeSuspectCount = 0
  private cookStartT: number | null = null
  // Reserved for future use: user-acknowledged pull time
  // private pullAcknowledgedT: number | null = null
  private peakDuringRest: number | null = null
  private restStartT: number | null = null
  private currentState: CookState = 'heating'

  constructor(config: CookConfig) {
    this.config = config
    this.pathogens = config.profile.pathogenIds
      .map(getPathogen)
      .filter((p): p is PathogenKinetics => p !== undefined)

    for (const p of this.pathogens) {
      this.logReductions.set(p.id, 0)
    }
  }

  /** Process a single probe sample. Returns the current cook frame. */
  ingest(tS: number, probeC: number): CookFrame {
    const dt = this.lastSampleT !== null ? tS - this.lastSampleT : 1.0
    if (this.cookStartT === null) this.cookStartT = tS

    const warnings: string[] = []

    // ── Plausibility gate ──────────────────────────────────────
    if (this.filteredC !== null) {
      const maxDelta = MAX_PHYSICAL_RATE_C_PER_S * dt + NOISE_MARGIN_C
      if (Math.abs(probeC - this.filteredC) > maxDelta) {
        this.probeSuspectCount++
        if (this.probeSuspectCount >= 3) {
          warnings.push('probe_suspect')
        }
        // Use last known filtered value
        probeC = this.filteredC
      } else {
        this.probeSuspectCount = 0
      }
    }

    // ── EMA filter ─────────────────────────────────────────────
    if (this.filteredC === null) {
      this.filteredC = probeC
    } else {
      const alpha = 1 - Math.exp(-dt / EMA_TAU_S)
      const newFiltered = this.filteredC + alpha * (probeC - this.filteredC)

      // Rate estimate with smoothing
      const rawRate = ((newFiltered - this.filteredC) / dt) * 60.0
      const beta = 1 - Math.exp(-dt / RATE_SMOOTHING_TAU_S)
      this.rateCPerMin += beta * (rawRate - this.rateCPerMin)

      this.filteredC = newFiltered
    }

    // ── Safety integrator ──────────────────────────────────────
    if (probeC > MIN_SAFETY_TEMP_C) {
      for (const p of this.pathogens) {
        const prev = this.logReductions.get(p.id) ?? 0
        const contribution =
          (dt / 60.0) * Math.pow(10, (probeC - p.tRefC) / p.zC) / p.dRefMin
        this.logReductions.set(p.id, prev + contribution)
      }
    }

    this.lastSampleT = tS
    this.tS = tS

    // ── Build frame ────────────────────────────────────────────
    return this.buildFrame(probeC, warnings)
  }

  private buildFrame(probeC: number, warnings: string[]): CookFrame {
    const target = this.config.doneness.targetCoreC
    const carry = this.estimateCarryover()
    const pull = this.config.cookMethod === 'sous_vide' ? target : target - carry
    const t = this.filteredC ?? probeC
    const r = this.rateCPerMin

    // ETA
    let eta: number | null = null
    if (r > MIN_RATE_FOR_ETA && t < pull) {
      eta = Math.max(0, ((pull - t) / r) * 60)
    }

    // Projected peak after carryover
    const projectedPeak = t >= pull ? t + carry : target

    // Texture window position
    const [twLow, twHigh] = this.config.doneness.textureWindowC
    const twRange = twHigh - twLow
    const twPos = twRange > 0 ? Math.max(0, Math.min(1, (t - twLow) / twRange)) : 0

    // Safety entries
    const safety = this.buildSafetyEntries()
    const allSafetySatisfied = safety.every((s) => s.satisfied || !s.binding)

    // State machine
    this.updateState(t, pull, target, eta, allSafetySatisfied, r)

    // Advice
    const advice = this.generateAdvice(eta, carry, target, t, pull, allSafetySatisfied)

    return {
      tS: this.tS,
      probeC,
      filteredC: t,
      rateCPerMin: r,
      targetCoreC: target,
      pullCoreC: pull,
      etaToPullS: eta,
      projectedPeakC: projectedPeak,
      textureWindowPosition: twPos,
      safety,
      allSafetySatisfied,
      state: this.currentState,
      advice,
      warnings,
    }
  }

  private buildSafetyEntries(): SafetyEntry[] {
    const profile = this.config.profile
    const doneness = this.config.doneness
    const surfaceOnly = profile.surfaceContaminatedOnly
    const cookTime = this.cookStartT !== null ? this.tS - this.cookStartT : 0

    return this.pathogens.map((p) => {
      const accumulated = this.logReductions.get(p.id) ?? 0
      const required = doneness.minLogReduction[p.id] ?? 0

      // Surface-contaminated whole muscle: credit surface after 60s of cook time
      const surfaceCredited = surfaceOnly && cookTime > 60

      // Binding = core must reach the integral (ground/poultry with required > 0)
      const binding = !surfaceOnly && required > 0

      return {
        pathogenId: p.id,
        pathogenName: p.name,
        logReductionAccumulated: accumulated,
        logReductionRequired: required,
        surfaceCredited,
        binding,
        satisfied: binding ? accumulated >= required : true,
      }
    })
  }

  private updateState(
    t: number,
    pull: number,
    target: number,
    eta: number | null,
    safetySatisfied: boolean,
    rate: number,
  ) {
    const prev = this.currentState

    // Track peak during resting
    if (prev === 'resting' || prev === 'pull_now') {
      if (this.peakDuringRest === null || t > this.peakDuringRest) {
        this.peakDuringRest = t
      }
    }

    switch (prev) {
      case 'heating':
        if (t >= target + OVERSHOOT_TOLERANCE_C) {
          this.currentState = 'overshot'
        } else if (t >= pull && safetySatisfied) {
          this.currentState = 'pull_now'
        } else if (eta !== null && eta <= APPROACHING_PULL_HORIZON_S) {
          this.currentState = 'approaching_pull'
        }
        break

      case 'approaching_pull':
        if (t >= target + OVERSHOOT_TOLERANCE_C) {
          this.currentState = 'overshot'
        } else if (t >= pull && safetySatisfied) {
          this.currentState = 'pull_now'
        }
        break

      case 'pull_now':
        if (t >= target + OVERSHOOT_TOLERANCE_C) {
          this.currentState = 'overshot'
        } else if (rate < -0.05) {
          // Temperature dropping = meat removed from heat
          this.currentState = 'resting'
          this.restStartT = this.tS
          this.peakDuringRest = t
        }
        break

      case 'resting': {
        const restDuration = this.restStartT !== null ? this.tS - this.restStartT : 0
        if (
          Math.abs(rate) < REST_DONE_RATE_THRESHOLD &&
          restDuration >= REST_DONE_MIN_DURATION_S
        ) {
          this.currentState = 'done'
        }
        if (t >= target + OVERSHOOT_TOLERANCE_C) {
          this.currentState = 'overshot'
        }
        break
      }

      case 'overshot':
      case 'done':
        // Terminal states (overshot is recoverable for display but engine stays)
        break
    }
  }

  private generateAdvice(
    eta: number | null,
    carry: number,
    target: number,
    t: number,
    _pull: number,
    safetySatisfied: boolean,
  ): string {
    const restMin = Math.max(4, Math.round(carry * 1.5))

    switch (this.currentState) {
      case 'heating':
        if (eta !== null && eta > 900) return 'Continue cooking.'
        if (eta !== null) return `~${formatDuration(eta)} to pull.`
        return 'Heating. Rate too low for ETA.'

      case 'approaching_pull':
        if (!safetySatisfied) {
          return 'Hold temperature. Pasteurization still accumulating.'
        }
        if (eta !== null) {
          return `Pull in ~${formatDuration(eta)}. Rest ${restMin} min${this.config.restTented ? ' tented' : ''}.`
        }
        return `Approaching target. Rest ${restMin} min after pull.`

      case 'pull_now':
        return `Pull now! Rest ${restMin} min${this.config.restTented ? ' tented' : ''}.`

      case 'resting':
        return 'Resting. Carryover in progress.'

      case 'done':
        return 'Done. Serve.'

      case 'overshot': {
        const over = t - target
        if (over < 4) {
          return `${over.toFixed(1)}°C over target. Rest uncovered to limit rise.`
        }
        return `${over.toFixed(1)}°C past target. Next cook, pull ${Math.round(over)}°C earlier.`
      }
    }
  }

  private estimateCarryover(): number {
    if (this.config.cookMethod === 'sous_vide') return 0

    const L = this.config.thicknessM / 2.0
    const alpha = this.config.profile.diffusivityM2S
    const tauRest = (L * L) / (Math.PI * Math.PI * alpha)
    const tRestS = 360 // nominal 6 min rest

    const tSurfEst = SURFACE_TEMP_ESTIMATES[this.config.cookMethod] ?? 150

    const kMeat = 0.04
    const kMethod = this.config.restTented ? 1.2 : 0.9
    const dTSurfCore = Math.max(0, tSurfEst - (this.filteredC ?? 20))

    return kMeat * kMethod * dTSurfCore * (1 - Math.exp(-tRestS / tauRest))
  }

  /** Get current state without ingesting a new sample */
  get state(): CookState {
    return this.currentState
  }

  /** Reset the engine for a new cook */
  reset() {
    this.tS = 0
    this.filteredC = null
    this.rateCPerMin = 0
    this.logReductions.clear()
    for (const p of this.pathogens) {
      this.logReductions.set(p.id, 0)
    }
    this.lastSampleT = null
    this.probeSuspectCount = 0
    this.cookStartT = null
    this.peakDuringRest = null
    this.restStartT = null
    this.currentState = 'heating'
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  if (sec === 0) return `${min} min`
  return `${min}m ${sec}s`
}
