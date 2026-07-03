# Church Caption

Real-time AI-powered bilingual captions for church worship services.

Church Caption helps bilingual churches make worship services more accessible for English-speaking attendees by translating live Chinese sermons into natural English and broadcasting captions in real time to any device.

---

# Current Version

## Version 0.2 – Cloud Beta

### Highlights

- ☁️ Cloud deployment with Vercel
- 🌐 Cross-browser and cross-device synchronization
- ⚡ Shared caption state using Redis
- 🤖 AI-powered Chinese → English translation
- 📱 Mobile-friendly live caption page
- 📖 Church-aware and Bible-aware translation

---

# Features

- 🎤 Browser-based speech recognition
- 🤖 AI-powered Chinese → English translation
- 📱 Live audience caption page
- ⚡ Real-time caption broadcasting
- ☁️ Shared cloud caption state
- ⛪ Church-specific translation policy
- 📖 Bible-aware terminology
- 📱 Works across browsers and devices

---

# System Architecture

```
                 Pastor
                    │
                    ▼
          Chrome Speech Recognition
                    │
                    ▼
             Operator Page
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   /api/translate      /api/caption-state
          │                   │
          ▼                   ▼
     Gemini 2.5 Flash       Redis
                              ▲
                              │
                    Live Audience Page
                              │
                              ▼
                     Audience Devices
```

---

# Project Structure

```
app/
│
├── operator/
├── live/
│
├── api/
│   ├── translate/
│   └── caption-state/
│
components/
│   Header
│   StatusCard
│   BroadcastCard
│   MicrophoneCard
│   AudienceCard
│   AdvancedSettings
│
lib/
│   captionApi
│   redis
│   translation
│   translationPrompt
│   service
│
types/
│   caption.ts
```

---

# Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### AI

- Google Gemini 2.5 Flash
- Chrome Speech Recognition

### Backend

- Next.js API Routes
- Upstash Redis
- Vercel

---

# Current MVP

## Operator Console

- Start / Stop live captions
- Manual caption broadcasting
- Live microphone recognition
- AI translation
- Translation status
- Translation latency
- Shared cloud broadcasting

## Audience Page

- Mobile-friendly display
- Live caption updates
- Waiting screen
- Church information
- Works on any browser

---

# Translation Policy

Church Caption is designed specifically for bilingual Christian worship.

The translation engine is instructed to:

- Preserve biblical meaning
- Use standard English Bible book names
- Detect Bible references
- Use natural church English
- Avoid word-for-word translation
- Follow a church-specific translation style

Example:

Chinese

```
今天我们来看约翰福音三章十五节。
```

↓

English

```
Today we'll study John 3:15.
```

---

# Design Principles

Church Caption follows a few core principles.

### Keep the operator workflow simple.

Technology should disappear during worship.

---

### Optimize for readability.

Audience members should read naturally rather than literally.

---

### Preserve biblical accuracy.

Bible terminology should remain consistent with common English translations.

---

### Separate UI from infrastructure.

The user interface should not know whether captions come from Redis, Gemini, or another service.

---

### Build incrementally.

Small, testable improvements are preferred over large rewrites.

---

# Roadmap

## Version 0.3 – Translation Stability

- Debounce translation requests
- Speech buffering
- Retry transient AI failures
- Better translation diagnostics
- Translation performance metrics

---

## Version 0.4 – Operator Experience

- QR code audience onboarding
- Connected audience count
- Service management
- Caption history
- Editable glossary

---

## Version 0.5 – Production Readiness

- Whisper transcription
- Speaker detection
- Translation memory
- Authentication
- Analytics
- Multi-language support

---

# Status

Current milestone:

✅ Version 0.2 – Cloud Beta

Completed

- ✅ Cloud deployment
- ✅ Redis shared caption state
- ✅ Cross-device synchronization
- ✅ AI translation
- ✅ Bible-aware translation policy
- ✅ Mobile audience page
- ✅ REST API architecture

Currently in progress

- 🚧 Translation stability
- 🚧 Speech buffering
- 🚧 Translation request optimization

---

# Vision

Church Caption aims to make bilingual worship services accessible without requiring expensive AV systems or dedicated hardware.

A single operator should be able to translate a live sermon into natural English and instantly share captions with every attendee using only a web browser.