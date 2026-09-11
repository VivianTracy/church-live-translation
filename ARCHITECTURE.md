# Church Translation Architecture

Live sermon audio is translated and sent to wireless headsets.

```text
OBS / mic → Chrome (/operator-live)
                  ↓  sign in (Supabase)
        POST /api/openai/audio-translation-session
                  ↓  church operator + Vault OpenAI key
        short-lived Realtime credential
                  ↓
        gpt-realtime-translate (WebRTC)
                  ↓
        translated audio → PC audio out → transmitter → wireless headsets
```

**Operator:** `/operator-live` after church sign-in  
**Public phones:** `/listen` (no sign-in)  
**API:** `POST /api/openai/audio-translation-session`

The browser never holds the church OpenAI key. The session endpoint:

1. Requires a signed-in user
2. Identifies that user’s church
3. Confirms the user is an authorized church operator
4. Reads that church’s OpenAI key from Vault on the server
5. Mints a temporary Realtime credential
6. Returns only that temporary credential
7. Rate-limits and records the session create

On Vercel, `OPENAI_API_KEY` is not used. Local `npm run start` can still use a local key when Supabase is not configured.

Operator session states: Off → Connecting → Live, with Reconnecting (up to two automatic attempts) and Failed.

## Design

- One volunteer on the church computer.
- Auto-detect Chinese or English, or lock a fixed direction.
- Do not change church production AV unless necessary.
