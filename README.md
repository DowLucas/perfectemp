# PerfecTemp

Custom companion app for wireless BLE meat thermometer probes. Reverse-engineered protocol, science-based cook engine with pathogen safety tracking.

## What this is

A web app that connects to a CXL001 wireless meat probe over Bluetooth Low Energy, displays real-time temperature, and guides you to the perfect pull time using thermal science — not just a target number.

The cook engine treats food safety as a time-temperature integral (not a threshold) and computes carryover from a conduction model, so you pull at the right moment and the meat coasts to your target during rest.

## Hardware

**CXL001** wireless meat probe (~$16 on AliExpress)

| Spec | Value |
|------|-------|
| BLE | 5.2 (DA14531 SoC) |
| Temp range | -20°C to 100°C |
| Accuracy | ±1°C |
| Range | 50m open air |
| Battery | 6hr, 20min USB charge |
| Waterproof | IP67 |
| Multi-probe | Up to 6 simultaneously |

The probe advertises as `BBQ` and uses a proprietary ASCII protocol — no login or handshake required. Full protocol details in [PROTOCOL.md](PROTOCOL.md).

## Features

- **BLE connection** with auto-reconnect (exponential backoff)
- **Live temperature** with EMA smoothing and rate-of-change
- **Real-time chart** (Recharts)
- **Cook engine** with:
  - 9 meat profiles (beef, pork, chicken, lamb, salmon) with science-based doneness levels
  - Pathogen safety integrator (Salmonella, Listeria, E. coli O157:H7) using peer-reviewed D/z values
  - Carryover model (1D conduction estimate based on thickness and cook method)
  - Pull temperature = target minus predicted carryover
  - ETA from smoothed rate
  - State machine: heating → approaching → pull now → resting → done
- **Signal processing**: outlier rejection gate, EMA filter, smoothed rate estimation

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React + TypeScript |
| Build | Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| State | Zustand |
| Charts | Recharts |
| BLE | Web Bluetooth API |
| Deploy | Docker (nginx:alpine) + Caddy |

## Getting started

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173` in **Chrome** (Web Bluetooth requirement). Click Connect, select your `BBQ` probe.

## Deploy

```bash
./deploy.sh
```

Builds the Vite app, copies to the server, rebuilds the Docker image, and restarts the container.

## BLE Protocol

The CXL001 probe uses a single GATT characteristic that streams ASCII temperature strings:

| Property | Value |
|----------|-------|
| Service UUID | `18424398-7cbc-11e9-8f9e-2a86e4085a59` |
| Characteristic UUID | `772ae377-b3d2-ff8e-1042-5481d1e03456` |
| Properties | NOTIFY |
| Data format | ASCII, e.g. `d28.1` = 28.1°C |
| Interval | ~1.5 seconds |
| Auth | None required |

See [PROTOCOL.md](PROTOCOL.md) for full reverse engineering notes.

## Project structure

```
├── PROTOCOL.md              # BLE protocol documentation
├── deploy.sh                # Deploy to server
├── prototype/
│   └── index.html           # Raw Web Bluetooth discovery tool
└── app/
    └── src/
        ├── lib/
        │   ├── ble.ts             # Protocol constants + ASCII decoder
        │   ├── cook-engine.ts     # Safety integrator, carryover, state machine
        │   └── meat-profiles.ts   # Pathogen kinetics + doneness data
        ├── stores/
        │   ├── probe-store.ts     # BLE connection + temp stream
        │   └── cook-store.ts      # Cook session state
        └── components/            # React UI
```

## Browser support

Web Bluetooth is required. Works in:
- Chrome (desktop, Android)
- Edge (desktop)
- Opera

Does **not** work in Safari, Firefox, or any iOS browser.

## License

MIT
