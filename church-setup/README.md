# Church Caption — Streaming Computer Setup

Install Church Caption on the church streaming PC (Mac or Windows) for Sunday worship with OBS and YouTube.

## Quick start

1. Clone this repository to the streaming computer.
2. Run the installer for your OS (see below).
3. Copy `church-setup/env.example` to `.env.local` and add API keys.
4. Follow [`README-SUNDAY.md`](./README-SUNDAY.md) each Sunday.

## Install

### Mac

```bash
cd church-setup
chmod +x install-mac.sh
./install-mac.sh
```

Requires: Node.js 20+, BlackHole 2ch for virtual audio.

### Windows

```powershell
cd church-setup
powershell -ExecutionPolicy Bypass -File install-windows.ps1
```

Requires: Node.js 20+, VB-Audio Virtual Cable (or similar) for virtual audio.

### Choose OS interactively

```bash
cd church-setup
chmod +x install.sh
./install.sh
```

## OBS overlay

See [`obs/browser-source.md`](./obs/browser-source.md). Optional starter scene collection: [`obs/church-caption-scenes.json`](./obs/church-caption-scenes.json).

## Pages (local)

| URL | Role |
|---|---|
| `http://localhost:3000/operator-openai` | Operator console |
| `http://localhost:3000/overlay` | OBS Browser Source |

Run locally with:

```bash
npm run dev
```

For Sunday production on the streaming PC, use `npm run build && npm run start`.
