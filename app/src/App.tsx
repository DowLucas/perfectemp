import { useProbeStore } from '@/stores/probe-store'
import { useCookStore } from '@/stores/cook-store'
import { isWebBluetoothSupported } from '@/lib/ble'
import { ConnectionStatus } from '@/components/connection-status'
import { TempDisplay } from '@/components/temp-display'
import { MetricsBar } from '@/components/metrics-bar'
import { TempChart } from '@/components/temp-chart'
import { CookSetup } from '@/components/cook-setup'
import { ActiveCook } from '@/components/active-cook'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Flame, Bluetooth, BluetoothOff, RotateCcw } from 'lucide-react'

function App() {
  const connect = useProbeStore((s) => s.connect)
  const disconnect = useProbeStore((s) => s.disconnect)
  const clearReadings = useProbeStore((s) => s.clearReadings)
  const connectionState = useProbeStore((s) => s.connectionState)
  const readings = useProbeStore((s) => s.readings)
  const isCookActive = useCookStore((s) => s.isActive)

  const isConnected = connectionState === 'connected'
  const isBusy =
    connectionState === 'scanning' ||
    connectionState === 'connecting' ||
    connectionState === 'reconnecting'

  if (!isWebBluetoothSupported()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <BluetoothOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">
            Web Bluetooth not supported
          </h2>
          <p className="text-sm text-muted-foreground">
            Open this page in Chrome on desktop or Android to use BLE.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-400" />
          <h1 className="text-base font-semibold tracking-tight">
            Perfec<span className="text-amber-400">Temp</span>
          </h1>
        </div>
        <ConnectionStatus />
      </header>

      <Separator />

      <main className="flex flex-1 flex-col gap-4 p-4">
        {/* Temperature display */}
        <TempDisplay />

        {/* Connect / Disconnect */}
        <div className="flex gap-2">
          {isConnected ? (
            <Button variant="outline" className="flex-1" onClick={disconnect}>
              <BluetoothOff className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button
              className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
              onClick={connect}
              disabled={isBusy}
            >
              <Bluetooth className="mr-2 h-4 w-4" />
              {isBusy ? 'Connecting...' : 'Connect Probe'}
            </Button>
          )}
          {readings.length > 0 && !isCookActive && (
            <Button variant="ghost" size="icon" onClick={clearReadings}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Cook UI */}
        {isCookActive ? <ActiveCook /> : <CookSetup />}

        {/* Metrics + Chart */}
        <MetricsBar />
        <TempChart />
      </main>
    </div>
  )
}

export default App
