import { useProbeStore } from '@/stores/probe-store'
import { Bluetooth, BluetoothOff, Loader2 } from 'lucide-react'

const stateConfig = {
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', icon: BluetoothOff },
  scanning: { label: 'Scanning...', color: 'text-blue-400', icon: Loader2 },
  connecting: { label: 'Connecting...', color: 'text-blue-400', icon: Loader2 },
  connected: { label: 'Connected', color: 'text-green-400', icon: Bluetooth },
  reconnecting: { label: 'Reconnecting...', color: 'text-yellow-400', icon: Loader2 },
} as const

export function ConnectionStatus() {
  const connectionState = useProbeStore((s) => s.connectionState)
  const deviceName = useProbeStore((s) => s.deviceName)
  const config = stateConfig[connectionState]
  const Icon = config.icon
  const spinning = connectionState === 'scanning' || connectionState === 'connecting' || connectionState === 'reconnecting'

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${config.color} ${spinning ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-medium ${config.color}`}>
        {deviceName && connectionState === 'connected'
          ? deviceName
          : config.label}
      </span>
    </div>
  )
}
