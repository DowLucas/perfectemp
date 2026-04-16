# CXL001 BLE Protocol — Reverse Engineering Log

**Probe model:** CXL001
**Manufacturer:** Shenzhen Chuangxinlian Electronics Co., Ltd (lonnmeter.com)
**FCC ID:** 2A2D2-CXL001
**Stock app:** Aicooking (iOS/Android)
**Date started:** 2026-04-16

---

## Device Discovery

### BLE Advertisement

| Property          | Value                                        |
|-------------------|----------------------------------------------|
| Device name       | `BBQ`                                        |
| Address           | `AB:BC:DD:01:F5:61` (public, may vary)       |
| Address type      | Public                                       |
| Manufacturer ID   | `0x55AA` (21930)                             |
| Manufacturer data | `43 58 4c 2d 32 34 30 34 2d 41 34 30 39 30 34` = `CXL-2404-A40904` |
| Advertised services | `0x180A` (Device Information), `18424398-7cbc-11e9-8f9e-2a86e4085a59` (Vendor) |
| RSSI              | -91 dBm (at ~5m distance)                    |

### Device Information Service (0x180A)

| Characteristic       | UUID   | Raw bytes                                          | Decoded              |
|----------------------|--------|----------------------------------------------------|----------------------|
| Manufacturer Name    | 0x2A29 | `42 42 51 20 43 6f 6d 70 61 6e 79`                | `BBQ Company`        |
| Model Number         | 0x2A24 | `44 41 31 34 35 33 31`                             | `DA14531`            |
| Firmware Revision    | 0x2A26 | `76 5f 36 2e 30 2e 31 36 2e 31 31 34 34`          | `v_6.0.16.1144`      |
| Software Revision    | 0x2A28 | `76 5f 36 2e 30 2e 31 36 2e 31 31 34 34`          | `v_6.0.16.1144`      |
| System ID            | 0x2A23 | `12 34 56 ff fe 9a bc de`                         | (placeholder bytes)  |
| PnP ID               | 0x2A50 | `01 d2 00 80 05 00 01`                             | Vendor=0x00D2, Product=0x0580, Version=0x0100 |

### BLE Chip

**Renesas DA14531** (ex-Dialog Semiconductor) — ultra-low-power BLE SoC.
- SDK: DA145xx SDK 6.x (confirmed by firmware version `v_6.0.16.1144`)
- Very common in cheap wireless probes and IoT devices

---

## GATT Service Tree

### Discovered via Chrome Web Bluetooth

Only Device Information (0x180A) was accessible. The vendor service was NOT
discovered by Chrome despite being listed in `optionalServices`.

### Discovered via bluetoothctl

Two services advertised:
1. `0000180a-0000-1000-8000-00805f9b34fb` — Device Information (standard)
2. `18424398-7cbc-11e9-8f9e-2a86e4085a59` — **Vendor-specific** (unknown)

### Problem: Vendor service not visible in Chrome

Chrome only discovered Device Information. The vendor service IS a primary service
(confirmed via bluetoothctl) but Chrome's Web Bluetooth may need the exact UUID
string format in `optionalServices`. See fix below.

---

## Protocol Classification

**This is NOT iBBQ.** The probe uses a proprietary protocol:
- iBBQ uses service `0xFFF0` — not present on this device
- The vendor UUID `18424398-7cbc-11e9-8f9e-2a86e4085a59` is unique to this product line
- Manufacturer data uses prefix `0x55AA` (not seen in iBBQ devices)
- Manufacturer data payload encodes model/serial: `CXL-2404-A40904`

---

## Full GATT Tree (via bluetoothctl)

Discovered 2026-04-16 by connecting via `bluetoothctl` and running `list-attributes`.

### Service 1: Generic Attribute Profile (0x1801)

| Type           | UUID   | Description          |
|----------------|--------|----------------------|
| Characteristic | 0x2A05 | Service Changed      |
| Descriptor     | 0x2902 | CCCD (notifications) |

### Service 2: Device Information (0x180A)

| Type           | UUID   | Description              |
|----------------|--------|--------------------------|
| Characteristic | 0x2A29 | Manufacturer Name String |
| Characteristic | 0x2A24 | Model Number String      |
| Characteristic | 0x2A26 | Firmware Revision String |
| Characteristic | 0x2A28 | Software Revision String |
| Characteristic | 0x2A23 | System ID                |
| Characteristic | 0x2A50 | PnP ID                   |

### Service 3: CXL001 Vendor Service

| Type           | UUID                                         | Description                         |
|----------------|----------------------------------------------|-------------------------------------|
| **Service**    | `18424398-7cbc-11e9-8f9e-2a86e4085a59`       | Primary vendor service              |
| **Characteristic** | `772ae377-b3d2-ff8e-1042-5481d1e03456`   | Main data characteristic (single!)  |
| Descriptor     | `0x2901`                                     | Characteristic User Description     |
| Descriptor     | `0x2902`                                     | CCCD (Client Characteristic Config) |

**Key finding:** The vendor service has only ONE characteristic (`772ae377-b3d2-ff8e-1042-5481d1e03456`).
The presence of CCCD (0x2902) means it supports **notifications**. The User Description
descriptor (0x2901) may contain a human-readable name for this characteristic.

All temperature data, commands, and responses likely flow through this single
characteristic — a common pattern for simple BLE devices using DA14531.

---

## Temperature Data Format (CONFIRMED)

**The probe sends temperature as ASCII text, not binary.**

### Example notification

| Raw bytes                | Hex                     | ASCII   | Meaning        |
|--------------------------|-------------------------|---------|----------------|
| `64 32 38 2e 31`         | `64 32 38 2e 31`        | `d28.1` | 28.1°C         |

### Encoding

- Format: ASCII string, prefix `d` followed by temperature in Celsius with one decimal
- Example: `d28.1` = 28.1°C
- The `d` prefix likely stands for "degrees"
- No login/handshake required — just subscribe to notifications and data flows immediately
- No binary decoding needed — just parse the ASCII string

### Decoding algorithm

```
1. Read notification as UTF-8 string
2. Strip leading non-numeric characters (prefix like 'd')
3. parseFloat() the remainder
4. Result is temperature in °C
```

This is dramatically simpler than iBBQ or other binary protocols.

---

## Protocol Status: FULLY DECODED (Phase 1 complete)

The CXL001 protocol is remarkably simple:
1. Connect to device named "BBQ"
2. Discover vendor service `18424398-7cbc-11e9-8f9e-2a86e4085a59`
3. Subscribe to notifications on `772ae377-b3d2-ff8e-1042-5481d1e03456`
4. Receive ASCII temperature strings every ~1.5s (e.g., `d33.3` = 33.3°C)

No login, no handshake, no binary decoding. Just subscribe and read ASCII.

## Open Questions

- Does the characteristic support WRITE? Could set target temp or change units on the probe itself
- What happens with multiple probes? Each probe is a separate BLE device with its own "BBQ" name
- Battery level — no battery service exposed. May be embedded in the ASCII stream under certain conditions
- What does the `d` prefix mean? Always `d`? Or could it change (e.g., `f` for Fahrenheit)?

---

## Reference: iBBQ Protocol (for comparison)

The iBBQ protocol was researched but does NOT apply to this probe. Documented here
for reference in case future probes use it.

| Characteristic | UUID   | Properties | Purpose                    |
|---------------|--------|------------|----------------------------|
| Settings Result | 0xFFF1 | NOTIFY   | Control message responses  |
| Login         | 0xFFF2 | WRITE      | Pairing credentials        |
| History       | 0xFFF3 | NOTIFY     | Historical data            |
| Realtime Temp | 0xFFF4 | NOTIFY     | Live temperature stream    |
| Settings      | 0xFFF5 | WRITE      | Control commands           |

iBBQ login bytes: `21 07 06 05 04 03 02 01 b8 22 00 00 00 00 00`
iBBQ enable realtime: `0b 01 00 00 00 00`
