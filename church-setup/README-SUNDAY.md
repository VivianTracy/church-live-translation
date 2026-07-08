# Sunday checklist — Church Caption

Use this on the **streaming computer** before and during the service.

## Before service (30 min)

- [ ] Open Terminal (Mac) or PowerShell (Windows)
- [ ] `cd` to the church-caption folder
- [ ] Run `npm run dev` (or `npm run start` if already built)
- [ ] Open **http://localhost:3000/operator-caption** in Chrome
- [ ] In **Microphone input**, select **BlackHole** (Mac) or **VB-Cable Output** (Windows)
- [ ] In OBS, confirm Browser Source points to **http://localhost:3000/overlay** (1920×1080)
- [ ] Adjust overlay font size and position on the operator page
- [ ] Start a private YouTube test stream — confirm captions appear on stream

## During service

| When | Operator action |
|---|---|
| Prayer / announcement (captions on) | Mode: **Others** → Start Live Caption → Start Microphone |
| Pastor preaches | Mode: **Sermon** → Start Live Caption → Start Microphone |
| Mid-sermon break | **Stop Microphone** (stay in Sermon mode) |
| Resume preaching | **Start Microphone** (same transcript files) |
| End of sermon | **End sermon session** |
| No captions needed | **Stop Live Caption** — quit the app |

## After service

- [ ] Stop Live Caption
- [ ] Sermon transcripts are saved in `transcripts/<session-id>/` (Sermon mode only)
- [ ] Stop `npm run dev` when done

## Troubleshooting

| Problem | Check |
|---|---|
| No captions | Whisper monitor — PCM peak should be > 0 |
| Overlay blank | Operator shows LIVE; OBS URL is `localhost:3000/overlay` |
| Wrong audio | Microphone input matches OBS monitoring device |
| Overlay not updating | Operator shows LIVE; restart OBS Browser Source if needed |
