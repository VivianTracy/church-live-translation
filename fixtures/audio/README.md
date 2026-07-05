# AV replay test audio (issue #24)

This folder holds the sermon replay clip used to mimic church OBS / X-USB input during operator testing.

- **Source:** https://www.youtube.com/live/2WlnOjEMJbA
- **Segment:** 47:00 – 54:00
- **Fixture file:** `sermon-replay-47-54.wav` (gitignored, ~40 MB)
- **Browser path:** `/test-audio/sermon-replay-47-54.wav`

## Generate locally

```bash
npm run extract:av-replay-audio
```

Requires `yt-dlp` and `ffmpeg`.

## Operator test mode

Open `/operator?test=1` for setup steps. Option 1 routes this clip through a virtual audio device (BlackHole on Mac, VB-Cable on Windows) into Chrome speech recognition.
