# Church Translation Architecture

Live sermon audio is translated and sent to wireless headsets.

```text
OBS / mic → Chrome (/operator-live)
                  ↓
        gpt-realtime-translate (WebRTC)
                  ↓
        translated audio → PC audio out → TT125-TX → wireless headsets
```

**Operator:** `/operator-live`  
**API:** `POST /api/openai/audio-translation-session`  
**Requires:** `OPENAI_API_KEY`

The browser never holds the OpenAI API key. The server mints a short-lived translation client secret.

## Design

- One volunteer on the church computer.
- Auto-detect Chinese or English, or lock a fixed direction.
- Do not change church production AV unless necessary.
