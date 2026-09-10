# Church Translation — Installation Guide

Install on the church computer (Mac or Windows) for live audio translation to wireless headsets. Optional phone listening uses a Vercel site and Upstash Redis.

每周主日操作（中英对照）：[`OPERATOR.md`](./OPERATOR.md)

Sunday operator steps (Chinese and English): [`OPERATOR.md`](./OPERATOR.md)

Phone listeners (Vercel + Redis) are a **one-time** setup below. Volunteers do not do this on Sunday.

## What the app detects automatically

On **Chrome** or **Edge**, the operator page uses the browser’s built-in device APIs. You do not need to edit config files for audio devices.

| Setting | How it is detected |
|---|---|
| **Audio input (Streaming)** | Lists system audio inputs (ClearClick, BlackHole, Default, etc.). Prefers **ClearClick / X32** when connected, then BlackHole 2ch / VB-Cable. |
| **Audio input (Microphone)** | Lists physical microphones and excludes virtual cables. |
| **Audio output** | Lists speakers and USB audio devices. Last choice is remembered. |
| **Translation direction** | Auto starts translating immediately (last used direction, or Chinese → English). It may switch after clear Chinese or English speech. Manual Chinese → English and English → Chinese remain as overrides. |

**First visit:** click **Allow access & refresh** on Audio in so the browser can show real device names.

**Browser requirement:** Use **Google Chrome** or **Microsoft Edge**. Firefox does not support routing translated audio to a chosen speaker (`setSinkId`).

---

## Wireless headsets

The app plays translated audio out of the church computer. A 3.5 mm cable carries that audio into the transmitter. Test this cable path first, before buying a full set of receivers.

| Package | What to buy | Why |
|---|---|---|
| **Small-church starter** | Retekess **TT125**: **one** transmitter and a few receivers | TT125 can work. Buy the smallest kit first and test with a direct cable from the computer. Add receivers only after Sunday audio is reliable. |
| **Recommended standard** | Retekess **TT116** transmitter plus the receivers you need | The TT116 transmitter has an explicit **3.5 mm line / microphone** input, a substantially stronger advertised range, and is designed more like a permanent church interpretation system. |

**First test (either kit)**

1. Connect a 3.5 mm cable from the computer headphone jack or USB audio dongle to the transmitter input (TT125 **MIC** port, or TT116 line / mic input).
2. Start translation on `/operator-live` and set **Audio out** to that jack or dongle.
3. Confirm one receiver hears the translation before you buy more packs.

Do not run the first test through a mixer, Bluetooth, or church Wi‑Fi. The computer must talk to the transmitter by cable.

---

## Quick start

1. Clone this repository to the church computer.
2. Run the installer for your OS (below).
3. Copy `church-setup/env.example` to `.env.local`.
4. Add `OPENAI_API_KEY` and `NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app`.
5. Install a virtual audio cable if you route audio through OBS.
6. Open **http://127.0.0.1:3000/operator-live** and confirm devices appear.
7. If people will listen on phones, finish **Phone listeners (Vercel + Redis)** once.

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
NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app
```

Do not add Redis keys on the church computer unless a teammate asks you to. Redis belongs on Vercel.

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

`npm run start` waits until the app is ready, then opens Chrome (or Edge) to **http://localhost:3000/operator-live**.

### 6. Configure operator-live

1. **Translation direction** — Auto, or lock Chinese → English / English → Chinese
2. **Audio in** — Streaming (ClearClick / BlackHole / CABLE Output) or Microphone
3. **Audio out** — jack or USB dongle to the transmitter input (TT125 **MIC**, or TT116 line / mic)
4. **Start translation** — wait until the status says **Live**

---

## Mac installation

```bash
cd church-setup
chmod +x install-mac.sh
./install-mac.sh
```

Requires Node.js 20+ and **BlackHole 2ch** for OBS virtual audio (https://existential.audio/blackhole/).

Edit `.env.local` with `OPENAI_API_KEY` and `NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app`.

OBS monitoring device: **BlackHole 2ch**. In operator-live Audio in, select **BlackHole 2ch**.

---

## Windows troubleshooting

| Problem | What to check |
|---|---|
| Empty input dropdown | Click **Allow access & refresh**. Allow microphone access when Chrome prompts. |
| No VB-Cable in the list | Install VB-Cable, reboot, confirm OBS monitoring uses **CABLE Input**, then refresh. |
| Wrong input after switching Streaming ↔ Mic | Stop translation first. Each mode remembers its own device. |
| No output devices | Use Chrome or Edge (not Firefox). Click **Refresh list** under Audio out. |
| Translation silent on headsets | Audio out must be the jack or dongle feeding the transmitter 3.5 mm input. |
| `OPENAI_API_KEY` error | `.env.local` in project root; restart `npm run dev` after editing. |
| Phone QR missing or local | Set `NEXT_PUBLIC_AUDIENCE_URL` in `.env.local` and restart. |
| Phone relay “Failed to fetch” | Restart the local app on this branch. The operator should call local `/api` only. |
| Phones stay on WAITING | Vercel Redis is missing or the last deploy cannot see the env vars. See below. |

---

## Phone listeners (Vercel + Redis)

This is a one-time setup by someone who can sign in to GitHub, Vercel, and Upstash. After it works, the QR code on the operator page stays the same every Sunday.

Headset translation still works if this section is skipped. Phones will not hear audio.

### What each computer does

| Place | Job |
|---|---|
| Church computer | Runs `/operator-live`, talks to OpenAI, plays headset audio |
| Vercel site | Hosts `/listen` and stores short audio chunks |
| Phones | Open `https://church-caption.vercel.app/listen` and tap **Tap to Listen** |

The OpenAI key stays on the church computer. Do not add it to Vercel.

Until this work is merged to `main`, point Vercel Production at the **`feature/browser-listener`** branch.

### 1. Vercel project

1. Sign in at [https://vercel.com](https://vercel.com) with the church GitHub account.
2. Import **`VivianTracy/church-live-translation`** (or your fork).
3. Framework preset: **Next.js**. Leave the build command as `next build`.
4. Production branch: **`feature/browser-listener`** until this is on `main`.
5. Deploy. The public URL should be **`https://church-caption.vercel.app`**.

If the project name is different, use that hostname everywhere you see `church-caption.vercel.app`.

### 2. Upstash Redis

Phones and the church computer share audio through Redis. Use the **REST** API, not a TCP `rediss://` URL.

**From the Vercel dashboard (easiest)**

1. Open the project → **Storage** (or **Marketplace**).
2. Create **Upstash Redis**.
3. After it is connected, open the database and copy:
   - **UPSTASH_REDIS_REST_URL** — starts with `https://` and ends with `.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN** — a long token

**From [https://console.upstash.com](https://console.upstash.com)**

1. Create a Redis database (the free tier is enough for Sunday listening).
2. Open the database → **REST API** / **Details**.
3. Copy the **Endpoint** (`https://....upstash.io`) and **Token**.

Do **not** copy:

- `REDIS_URL` or any `rediss://...` value
- A name such as `UPSTASH_REST_API_URL` (that name is not used)
- Quote marks around the URL or token

If Vercel also created old **KV** names (`KV_REST_API_URL` / `KV_REST_API_TOKEN`), leave them unused unless they are the only working REST pair. Prefer the Upstash names. An old KV host that no longer resolves will break phones.

### 3. Environment variables on Vercel

In the Vercel project → **Settings** → **Environment Variables**, add these for **Production**:

| Name | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://….upstash.io` (no quotes) |
| `UPSTASH_REDIS_REST_TOKEN` | token only (no quotes) |
| `NEXT_PUBLIC_AUDIENCE_URL` | `https://church-caption.vercel.app` |

Do **not** add `OPENAI_API_KEY` here.

Then:

1. Open **Deployments**.
2. Open the latest Production deployment → **Redeploy**.
3. Uncheck **Use existing Build Cache**.
4. Redeploy. Env changes do not apply until this finishes.

### 4. Check that Vercel can see Redis

On a laptop (not required to be the church computer):

```bash
curl -sS https://church-caption.vercel.app/api/translation-listen-state
```

You want JSON like:

```json
{"isLive":false,"updatedAt":0,"relayConfigured":true}
```

| Result | Meaning |
|---|---|
| `"relayConfigured":true` | Redis keys are live. Continue. |
| `"relayConfigured":false` | Env vars are missing on the running deploy. Recheck names, then Redeploy without cache. |
| HTML login page | Vercel **Deployment Protection** is on. Turn off Vercel Authentication for this project so phones and the church computer can reach `/listen`. |
| Browser error on `/listen` | Confirm the Production URL and that the latest deployment succeeded. |

Also open **https://church-caption.vercel.app/listen**. You should see **WAITING** and **Tap to Listen** (the button stays disabled until the operator is live).

### 5. Church computer env for the QR

On the church computer, `.env.local` needs:

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_AUDIENCE_URL=https://church-caption.vercel.app
```

Restart after editing:

```bash
npm run build
npm run start
```

The operator page should show a green note: **Phone QR points to https://church-caption.vercel.app/listen.**

The QR never changes. Print it or leave it on the operator screen. People can use mobile data.

### 6. Test once before Sunday

1. Start translation on the church computer until status is **Live**.
2. On a phone (Safari or Chrome), open the QR URL or type `https://church-caption.vercel.app/listen`.
3. When the page says **LIVE**, tap **Tap to Listen**. iPhones need that tap before sound plays.
4. On the operator page, **Phone relay active** should start counting chunks.
5. The phone should say **Receiving live translation audio.**

If headsets have sound but phones do not, Redis or the Vercel deploy is the problem, not OpenAI.

### Phone troubleshooting

| Problem | What to check |
|---|---|
| Operator shows Failed to fetch | Use this branch and restart `npm run start`. The page should call local `/api`, not Vercel from the browser. |
| `relayConfigured` is false | Vercel env names, no quotes, then Redeploy **without** build cache. |
| Redis / `fetch failed` on Vercel | URL must be `https://….upstash.io`. Delete unused `REDIS_URL`. Prefer Upstash names over a dead `KV_REST_API_*` host. |
| Phones hear choppy old audio | Confirm the deployed site includes the current listener playback code on this branch. |
| iPhone is silent | The listener must tap **Tap to Listen** after the page says LIVE. Use headphones. |
| QR points at localhost | `NEXT_PUBLIC_AUDIENCE_URL` is missing on the church computer. Restart after adding it. |
