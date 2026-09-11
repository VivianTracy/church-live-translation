# Decisions

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
