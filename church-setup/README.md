# Church Caption — Installation Guide

Install Church Caption on the church computer (Mac or Windows) for live audio translation and optional YouTube captions.

## What the app detects automatically

On **Chrome** or **Edge**, the operator pages use the browser’s built-in device APIs. You do not need to edit config files for audio devices.

| Setting | How it is detected |
|---|---|
| **Audio input (OBS mode)** | Lists virtual cables (BlackHole on Mac, VB-Cable on Windows). If one is installed, it is **selected automatically**. |
| **Audio input (Microphone mode)** | Lists physical microphones and **excludes** virtual cables. The first usable mic is selected if nothing was saved before. |
| **Audio output** | Lists all speakers and USB audio devices Windows exposes. Your last choice is remembered; otherwise the first listed device is used. |
| **Translation direction** | Chinese → English or English → Chinese; saved in the browser. |

**First visit:** click **Allow access & refresh** on the Audio in step so Windows can show real device names (not blank entries). Output devices usually appear without extra permission.

**Browser requirement:** Use **Google Chrome** or **Microsoft Edge**. Firefox does not support routing translated audio to a chosen speaker (`setSinkId`).

---

## Quick start

1. Clone this repository to the church computer.
2. Run the installer for your OS (below).
3. Copy `church-setup/env.example` to `.env.local` and add your API keys.
4. Install a virtual audio cable if you route audio through OBS (see Windows or Mac section).
5. Open the operator page and confirm devices appear in the dropdowns.

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

1. Download **LTS** from https://nodejs.org
2. Run the installer (default options are fine)
3. Open **PowerShell** and verify:

```powershell
node --version
npm --version
```

### 2. Run the project installer

```powershell
cd path\to\church-caption\church-setup
powershell -ExecutionPolicy Bypass -File install-windows.ps1
```

This runs `npm install`, creates `.env.local` from `env.example` if missing, and creates the `transcripts` folder.

### 3. Add your API key

Edit `.env.local` in the project root:

```env
OPENAI_API_KEY=sk-...
```

For caption overlay on the same PC only (no Redis), you can add:

```env
CAPTION_STORAGE=local
```

### 4. Install VB-Audio Virtual Cable (OBS audio only)

Skip this section if you use **Microphone** mode with a room mic or headset.

1. Download and install **VB-Cable** from https://vb-audio.com/Cable/
2. Reboot if the installer asks you to
3. In **OBS** → **Settings** → **Audio**:
   - Set **Advanced** → **Monitoring Device** to **CABLE Input (VB-Audio Virtual Cable)**
4. For each audio source you want translated, open **Advanced Audio Properties** and set **Audio Monitoring** to **Monitor and Output**

After setup, Chrome should list **CABLE Output (VB-Audio Virtual Cable)** under Audio in when **OBS (Streaming)** is selected.

### 5. Start the app

Development (rehearsal):

```powershell
cd path\to\church-caption
npm run dev
```

Production (recommended on the church PC):

```powershell
npm run build
npm run start
```

### 6. Open the operator page

| URL | Use |
|---|---|
| http://localhost:3000/operator-live | **Live audio translation** to wireless headsets (TT125) |
| http://localhost:3000/operator-caption | YouTube captions + sermon transcripts |
| http://localhost:3000/overlay | OBS Browser Source for captions |

Use **operator-live** for Retekess headset translation.

### 7. Configure audio on operator-live

1. **Translation direction** — Chinese → English or English → Chinese
2. **Audio in**
   - **OBS (Streaming)** — choose **CABLE Output (VB-Audio Virtual Cable)** (auto-selected when installed)
   - **Microphone** — choose the room mic, headset, or built-in mic
3. **Audio out** — choose where translated audio plays:
   - **Monitor headphone jack** on the PC (often labeled **Speakers** or **Realtek**)
   - **USB audio dongle** if the PC has no 3.5 mm jack
   - Run a 3.5 mm cable from that output to the **TT125-TX MIC** port
4. **Go live** → **Start audio input** and check the level meters

If the wrong output is selected, open **Settings → System → Sound** in Windows and confirm the default playback device, or pick the correct device in the **Audio out** dropdown.

---

## Mac installation

```bash
cd church-setup
chmod +x install-mac.sh
./install-mac.sh
```

Requires: Node.js 20+, **BlackHole 2ch** for OBS virtual audio (https://existential.audio/blackhole/).

OBS monitoring device: **BlackHole 2ch**. In operator-live Audio in, select **BlackHole 2ch**.

---

## Choose OS interactively

```bash
cd church-setup
chmod +x install.sh
./install.sh
```

---

## OBS overlay (captions)

See [`obs/browser-source.md`](./obs/browser-source.md). Optional starter scene: [`obs/church-caption-scenes.json`](./obs/church-caption-scenes.json).

---

## Windows troubleshooting

| Problem | What to check |
|---|---|
| Empty input dropdown | Click **Allow access & refresh**. Allow microphone access when Chrome/Edge prompts. |
| No VB-Cable in the list | Install VB-Cable, reboot, confirm OBS monitoring uses **CABLE Input**, then refresh. |
| Wrong input after switching OBS ↔ Mic | Stop translation first. Each mode remembers its own device. |
| No output devices | Use Chrome or Edge (not Firefox). Click **Refresh list** under Audio out. |
| Translation silent on headsets | Audio out must be the jack or dongle feeding the TT125-TX. Check Windows Sound settings. |
| `OPENAI_API_KEY` error | `.env.local` in project root; restart `npm run dev` or `npm run start` after editing. |
| Page won’t load on church PC | Firewall: allow Node on port **3000**, or use `npm run start` after `npm run build`. |

---

## Sunday checklist

For caption + OBS workflow, see [`README-SUNDAY.md`](./README-SUNDAY.md).

For live headset translation only, use **operator-live** with the steps in section 7 above.
