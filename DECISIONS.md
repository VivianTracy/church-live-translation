# Decisions

## 2026-10-07

Korean, French, and Spanish live on a second operator screen, `/operator-languages`. `/operator-live` stays Chinese and English, including Auto. A fresh sign-in opens a choice between the two. The headset language is `en`, `zh`, `ko`, `fr`, or `es` on the same `gpt-realtime-translate` session.

**Reason:** Sunday Chinese–English operation stays one page. The extra languages are official output languages of the model already in use, and the sermon dropdown is only a volunteer label.

**Known issue:** A local Mac test (English sermon, Chinese headset, Mac microphone in, earpiece out) still has no headset audio and a flat output level. The page can show Sending translation and a latency time from transcript text while the output graph has no samples. Playback now goes through the audio context destination instead of a hidden audio element, and that change did not restore sound. Phone-relay 404s for `church=local` are separate: they happen when Supabase is off and do not carry the headset audio.

## 2026-09-10

Public Vercel operator uses Supabase church login. The session endpoint identifies the signed-in user’s church, requires an authorized operator, reads that church’s OpenAI key from Vault, and returns only a temporary Realtime credential. Session creates are rate-limited and recorded. Secret metadata stays in a private schema.

**Reason:** The OpenAI key must not live in the browser or as a shared Vercel env var once the operator page is on the public internet.

## 2026-09-09

Reliable single-church operator: one **Start translation** button, explicit Off / Connecting / Live / Reconnecting / Failed status, two automatic reconnects, and `next start` bound to `127.0.0.1`.

**Reason:** Volunteers should never see Live when audio is not running. The church computer should not expose the OpenAI session endpoint on the LAN.

Main is live headset translation only (`/operator-live`).

YouTube caption overlay, Gemini caption operator, Redis caption state, and related pages were removed from main so Sunday setup stays one path: audio in → translated audio out.

## 2026-07-01

Version 1 supports Chinese ↔ English translation for wireless headsets.

**Reason:** Keep the product focused and easy for volunteers.
