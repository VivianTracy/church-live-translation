> This project was built to help bilingual churches make worship services more accessible for English-speaking attendees through real-time AI translation.
# Church Caption

Real-time AI-powered bilingual captions for church worship services.

Church Caption listens to a live Chinese sermon, translates it into natural English using AI, and broadcasts captions instantly to English-speaking attendees.

---

## Features

- 🎤 Browser-based speech recognition
- 🤖 AI-powered Chinese → English translation
- 📱 Live audience caption page
- ⛪ Church-specific translation policy
- 📖 Bible-aware terminology
- ⚡ Near real-time caption broadcasting

---

## Current Architecture

```
Pastor
    │
    ▼
Microphone (Chrome)
    │
    ▼
Speech Recognition
    │
    ▼
Church Translation Policy
    │
    ▼
Gemini 2.5 Flash
    │
    ▼
Live Caption Broadcast
    │
    ▼
Audience Devices
```

---

## Project Structure

```
app/
    operator/
    live/
    api/
        translate/

components/
    Header
    StatusCard
    BroadcastCard
    MicrophoneCard
    AudienceCard
    AdvancedSettings

lib/
    captionState
    translation
    translationPrompt
    service
```

---

## Technology

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Google Gemini API
- Chrome Speech Recognition

---

## Current MVP

### Operator

- Start / Stop live captions
- Broadcast manual captions
- Live microphone recognition
- AI translation
- Translation status
- Translation latency

### Audience

- Mobile-friendly caption display
- Live updates
- Waiting state
- Shared worship service information

---

## Translation Policy

Church Caption is designed specifically for bilingual Christian worship.

The translation policy includes:

- Biblical terminology
- Standard English Bible book names
- Natural church English
- Church-specific style guide
- Worship vocabulary

---

## Roadmap

### Version 0.2

- QR code generation
- Connected audience count
- Editable glossary
- Session management
- Multiple worship services

### Version 0.3

- Whisper transcription
- Speaker detection
- Translation memory
- Caption history

### Future Ideas

- Bible reference detection
- Bible verse panel
- Pastor-specific translation profiles
- Multi-language support
- Cloud deployment

---

## Status

Current milestone:

✅ First Sunday Demo

## Design Principles

Church Caption follows a few core principles:

- Keep the operator workflow simple.
- Optimize for readability over literal translation.
- Preserve biblical accuracy.
- Prefer church terminology familiar to English-speaking Christians.
- Build small, testable features incrementally.
