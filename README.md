# Church Caption

## Mission

> **Making bilingual worship accessible without requiring a dedicated interpreter.**

Church Caption helps bilingual churches provide live English translation during worship services while fitting naturally into their existing AV and livestream workflow.

The goal is not to replace church volunteers, but to reduce the burden on translation coworkers and make worship more accessible for English-speaking attendees.

---

## Current Version

### Version 0.2 – Cloud Beta

Church Caption currently supports:

- Browser speech recognition
- AI-powered Chinese → English translation
- Redis-backed shared caption state
- Cross-browser and cross-device synchronization
- Operator console
- Audience live page
- Church-specific translation policy
- Bible-aware terminology

---

## Current Features

- 🎤 Browser-based speech recognition
- 🤖 AI-powered Chinese → English translation
- ☁️ Redis-backed shared caption state
- 📱 Audience live caption page
- 🖥️ Operator console
- ⛪ Church-specific translation policy
- 📖 Bible-aware terminology
- 🌐 Vercel cloud deployment

---

## Design Principles

Church Caption follows these principles:

- Integrate into the existing church AV workflow.
- Do not require changes to the production audio system.
- Keep the operator workflow simple.
- Preserve biblical accuracy.
- Optimize for readable captions, not word-for-word translation.
- Support churches with or without volunteer interpreters.
- Build incrementally and validate with real worship services.

---

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Gemini
- Upstash Redis / Vercel KV
- Vercel
- Chrome Speech Recognition

---

## Current Architecture

```text
Chrome Speech Recognition
        ↓
Operator Page
        ↓
Gemini Translation API
        ↓
Redis Caption State
        ↓
Live Audience Page
```

For more detail, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

New collaborators: see [`docs/COLLABORATOR_SETUP.md`](./docs/COLLABORATOR_SETUP.md) for setup and GitHub/Cursor workflow.

---

## Roadmap

### Version 0.3 – First Church Workflow Integration

Goal:

Integrate Church Caption into a real worship service without changing the existing AV workflow.

Objectives:

- Validate operation on the church streaming computer
- Use existing X32 USB audio feed when possible
- Evaluate OBS integration
- Create an OBS-friendly overlay output
- Continue translation stability improvements
- Test in a real Sunday worship environment

---

## Research Branch

Experimental architecture work lives in:

```text
research/audio-first
```

This branch may explore:

- Audio-first translation
- Gemini Live API
- Google Speech-to-Text
- Chrome Translator API
- OBS overlay
- Dedicated translation audio mix
- Multiple speaker support

---

## Long-Term Vision

Church Caption is not just a caption app.

It is a church translation platform designed to help churches communicate the Gospel across language barriers while fitting naturally into existing worship technology.