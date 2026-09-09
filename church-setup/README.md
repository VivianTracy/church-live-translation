# Church Translation — Installation Guide

Install on the church computer (Mac or Windows) for live audio translation to wireless headsets.

## What the app detects automatically

On **Chrome** or **Edge**, the operator page uses the browser’s built-in device APIs. You do not need to edit config files for audio devices.

| Setting | How it is detected |
|---|---|
| **Audio input (Streaming)** | Lists system audio inputs (ClearClick, BlackHole, Default, etc.). Prefers **ClearClick / X32** when connected, then BlackHole 2ch / VB-Cable. |
| **Audio input (Microphone)** | Lists physical microphones and excludes virtual cables. |
| **Audio output** | Lists speakers and USB audio devices. Last choice is remembered. |
| **Translation direction** | Auto listens for Chinese or English and translates the other way. Manual Chinese → English and English → Chinese remain as overrides. |

**First visit:** click **Allow access & refresh** on Audio in so the browser can show real device names.

**Browser requirement:** Use **Google Chrome** or **Microsoft Edge**. Firefox does not support routing translated audio to a chosen speaker (`setSinkId`).

---

## Quick start

1. Clone this repository to the church computer.
2. Run the installer for your OS (below).
3. Copy `church-setup/env.example` to `.env.local` and add `OPENAI_API_KEY`.
4. Install a virtual audio cable if you route audio through OBS.
5. Open **http://localhost:3000/operator-live** and confirm devices appear.

---

## Windows installation

### Requirements

| Item | Notes |
|---|---|
| **Windows 10 or 11** | 64-bit |
| **Node.js 20 LTS or newer** | https://nodejs.org |
| **Google Chrome or Microsoft Edge** | Required for device listing and audio routing |
| **VB-Audio Virtual Cable** | Only if audio comes from OBS — https://vb-audio.com/Cable/ |
| **OpenAI API key** | Set in `.env.local` |

### 1. Install Node.js

Download **LTS** from https://nodejs.org, then in PowerShell:

```powershell
node --version
npm --version
```

### 2. Run the project installer

```powershell
cd path\to\church-live-translation\church-setup
powershell -ExecutionPolicy Bypass -File install-windows.ps1
```

This runs `npm install` and creates `.env.local` from `env.example` if missing.

### 3. Add your API key

Edit `.env.local` in the project root:

```env
OPENAI_API_KEY=sk-...
```

### 4. Install VB-Audio Virtual Cable (OBS audio only)

Skip if you use **Microphone** mode with a room mic or headset.

1. Install **VB-Cable** from https://vb-audio.com/Cable/
2. In **OBS** → **Settings** → **Audio**, set **Monitoring Device** to **CABLE Input (VB-Audio Virtual Cable)**
3. For each audio source to translate, set **Audio Monitoring** to **Monitor and Output**

Chrome should list **CABLE Output** under Audio in when **Streaming** is selected.

### 5. Start the app

```powershell
cd path\to\church-live-translation
npm run dev
```

Production on the church PC:

```powershell
npm run build
npm run start
```

Open **http://localhost:3000/operator-live**.

### 6. Configure operator-live

1. **Translation direction** — Auto, or lock Chinese → English / English → Chinese
2. **Audio in** — Streaming (ClearClick / BlackHole / CABLE Output) or Microphone
3. **Audio out** — jack or USB dongle to the **TT125-TX MIC** port
4. **Go live** → **Start audio input**

---

## Mac installation

```bash
cd church-setup
chmod +x install-mac.sh
./install-mac.sh
```

Requires Node.js 20+ and **BlackHole 2ch** for OBS virtual audio (https://existential.audio/blackhole/).

OBS monitoring device: **BlackHole 2ch**. In operator-live Audio in, select **BlackHole 2ch**.

---

## Windows troubleshooting

| Problem | What to check |
|---|---|
| Empty input dropdown | Click **Allow access & refresh**. Allow microphone access when Chrome prompts. |
| No VB-Cable in the list | Install VB-Cable, reboot, confirm OBS monitoring uses **CABLE Input**, then refresh. |
| Wrong input after switching Streaming ↔ Mic | Stop translation first. Each mode remembers its own device. |
| No output devices | Use Chrome or Edge (not Firefox). Click **Refresh list** under Audio out. |
| Translation silent on headsets | Audio out must be the jack or dongle feeding the TT125-TX. |
| `OPENAI_API_KEY` error | `.env.local` in project root; restart `npm run dev` after editing. |
