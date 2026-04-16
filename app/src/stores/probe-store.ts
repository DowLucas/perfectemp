import { create } from 'zustand'
import {
  CXL_SERVICE,
  CXL_CHAR,
  decodeAsciiTemp,
  type ConnectionState,
  type Reading,
} from '@/lib/ble'

const MAX_READINGS = 1800 // 30 min at ~1 reading/1.5s
const EMA_ALPHA = 0.15
const MAX_RECONNECT_ATTEMPTS = 20

interface ProbeStore {
  // Connection
  connectionState: ConnectionState
  deviceName: string | null
  device: BluetoothDevice | null
  server: BluetoothRemoteGATTServer | null

  // Temperature
  currentTemp: number | null
  smoothedTemp: number | null
  peakTemp: number | null
  readings: Reading[]
  startTime: number | null
  ratePerMin: number | null

  // Reconnection
  reconnectAttempts: number
  intentionalDisconnect: boolean
  reconnectTimer: ReturnType<typeof setTimeout> | null

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  clearReadings: () => void
}

export const useProbeStore = create<ProbeStore>((set, get) => ({
  connectionState: 'disconnected',
  deviceName: null,
  device: null,
  server: null,
  currentTemp: null,
  smoothedTemp: null,
  peakTemp: null,
  readings: [],
  startTime: null,
  ratePerMin: null,
  reconnectAttempts: 0,
  intentionalDisconnect: false,
  reconnectTimer: null,

  connect: async () => {
    if (!navigator.bluetooth) return

    set({ intentionalDisconnect: false, reconnectAttempts: 0 })

    const timer = get().reconnectTimer
    if (timer) {
      clearTimeout(timer)
      set({ reconnectTimer: null })
    }

    set({ connectionState: 'scanning' })

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [CXL_SERVICE, 0x180a],
      })

      set({ device, deviceName: device.name ?? device.id })
      device.addEventListener('gattserverdisconnected', handleDisconnect)
      await connectAndInit(device)
    } catch (err) {
      const error = err as Error
      if (error.name !== 'NotFoundError') {
        console.error('Connect error:', error)
      }
      set({ connectionState: 'disconnected' })
    }
  },

  disconnect: () => {
    set({ intentionalDisconnect: true })
    const { device, reconnectTimer } = get()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      set({ reconnectTimer: null })
    }
    if (device?.gatt?.connected) {
      device.gatt.disconnect()
    }
    set({
      connectionState: 'disconnected',
      server: null,
      reconnectAttempts: 0,
    })
  },

  clearReadings: () => {
    set({
      readings: [],
      currentTemp: null,
      smoothedTemp: null,
      peakTemp: null,
      startTime: null,
      ratePerMin: null,
    })
  },
}))

async function connectAndInit(device: BluetoothDevice) {
  const store = useProbeStore
  store.setState({ connectionState: 'connecting' })

  const server = await device.gatt!.connect()
  store.setState({ server, connectionState: 'connected', reconnectAttempts: 0 })

  // Subscribe to CXL001 temperature characteristic
  try {
    const svc = await server.getPrimaryService(CXL_SERVICE)
    const char = await svc.getCharacteristic(CXL_CHAR)

    char.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      const val = target.value
      if (!val) return

      const tempC = decodeAsciiTemp(val)
      if (tempC === null) return

      const state = store.getState()
      const now = Date.now()
      const startTime = state.startTime ?? now

      // EMA smoothing
      const smoothedTemp =
        state.smoothedTemp === null
          ? tempC
          : EMA_ALPHA * tempC + (1 - EMA_ALPHA) * state.smoothedTemp

      const peakTemp =
        state.peakTemp === null ? tempC : Math.max(state.peakTemp, tempC)

      const reading: Reading = { ts: now, tempC, smoothedC: smoothedTemp }
      const readings = [...state.readings, reading]
      if (readings.length > MAX_READINGS) readings.shift()

      // Rate of change over last 60s
      let ratePerMin: number | null = null
      const windowStart = now - 60000
      const recent = readings.filter((r) => r.ts >= windowStart)
      if (recent.length >= 2) {
        const first = recent[0]
        const last = recent[recent.length - 1]
        const dtMin = (last.ts - first.ts) / 60000
        if (dtMin > 0) {
          ratePerMin = (last.smoothedC - first.smoothedC) / dtMin
        }
      }

      store.setState({
        currentTemp: tempC,
        smoothedTemp,
        peakTemp,
        readings,
        startTime,
        ratePerMin,
      })
    })

    await char.startNotifications()
  } catch (err) {
    console.error('CXL001 init failed:', err)
    store.setState({ connectionState: 'disconnected' })
  }
}

function handleDisconnect() {
  const store = useProbeStore
  const state = store.getState()

  if (state.intentionalDisconnect) {
    store.setState({ connectionState: 'disconnected', server: null })
    return
  }

  store.setState({ connectionState: 'reconnecting', server: null })
  attemptReconnect()
}

function attemptReconnect() {
  const store = useProbeStore
  const state = store.getState()

  if (!state.device || state.intentionalDisconnect) return

  if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    store.setState({ connectionState: 'disconnected' })
    return
  }

  const attempt = state.reconnectAttempts + 1
  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000)
  store.setState({ reconnectAttempts: attempt })

  const timer = setTimeout(async () => {
    try {
      await connectAndInit(state.device!)
    } catch {
      attemptReconnect()
    }
  }, delay)

  store.setState({ reconnectTimer: timer })
}
