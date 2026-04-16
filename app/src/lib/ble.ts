// CXL001 BLE Protocol Constants
export const CXL_SERVICE = '18424398-7cbc-11e9-8f9e-2a86e4085a59'
export const CXL_CHAR = '772ae377-b3d2-ff8e-1042-5481d1e03456'
export const DEVICE_INFO_SERVICE = 0x180a

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export interface Reading {
  ts: number
  tempC: number
  smoothedC: number
}

export function decodeAsciiTemp(dataView: DataView): number | null {
  const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  // Strip leading non-numeric prefix (e.g., "d" in "d28.1")
  const numStr = str.replace(/^[^0-9.\-]+/, '')
  const temp = parseFloat(numStr)
  return isNaN(temp) ? null : temp
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}
