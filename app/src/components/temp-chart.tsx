import { useProbeStore } from '@/stores/probe-store'
import { Card } from '@/components/ui/card'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useMemo } from 'react'

function formatTime(ts: number, startTime: number): string {
  const elapsed = Math.floor((ts - startTime) / 1000)
  const min = Math.floor(elapsed / 60)
  const sec = elapsed % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function TempChart() {
  const readings = useProbeStore((s) => s.readings)
  const startTime = useProbeStore((s) => s.startTime)

  // Downsample for rendering: max 300 points
  const data = useMemo(() => {
    if (readings.length === 0) return []
    const step = Math.max(1, Math.floor(readings.length / 300))
    const sampled = []
    for (let i = 0; i < readings.length; i += step) {
      sampled.push({
        ts: readings[i].ts,
        temp: parseFloat(readings[i].smoothedC.toFixed(1)),
      })
    }
    // Always include the last point
    const last = readings[readings.length - 1]
    if (sampled[sampled.length - 1]?.ts !== last.ts) {
      sampled.push({
        ts: last.ts,
        temp: parseFloat(last.smoothedC.toFixed(1)),
      })
    }
    return sampled
  }, [readings])

  if (data.length < 2) {
    return (
      <Card className="flex h-[220px] items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">
          Waiting for temperature data...
        </span>
      </Card>
    )
  }

  const temps = data.map((d) => d.temp)
  const minTemp = Math.floor(Math.min(...temps)) - 2
  const maxTemp = Math.ceil(Math.max(...temps)) + 2

  return (
    <Card className="p-4">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Temperature over time
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts: number) =>
              startTime ? formatTime(ts, startTime) : ''
            }
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minTemp, maxTemp]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${v}°`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d24',
              border: '1px solid #2e3340',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e4e4e7',
            }}
            labelStyle={{ color: '#8b8d94' }}
            itemStyle={{ color: '#f59e0b' }}
            labelFormatter={(label) =>
              startTime ? formatTime(Number(label), startTime) : ''
            }
            formatter={(value) => [`${value}°C`, 'Temp']}
            cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b', stroke: '#1a1d24', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
