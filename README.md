# Church Caption

Version: MVP 0.1
Status: Active Development 

Church Caption is an open-source project that helps churches remove language barriers during worship by providing real-time AI-powered captions.  It was inspired by the need to help English-speaking family members, youth, visitors, and multilingual congregations participate more fully in Chinese-language worship services through real-time AI-powered captions.

Many congregations include members who do not fully understand the sermon language. Church Caption gives English-speaking spouses, ABC youth, and visitors a simple way to follow along—without requiring extra AV staff or complex equipment.

## MVP Scope

Version 1 is intentionally narrow:

- **Chinese sermon** as the source language
- **English live captions** for the audience
- **Simple operator interface** for a single volunteer in the sound booth
- **Mobile audience experience** via QR code

The goal is not to support every language or workflow on day one. The goal is to make one use case work reliably on Sunday morning.

## Vision

If the MVP succeeds, Church Caption may grow to support:

- Scripture recognition
- Automatic Bible verse display
- Sermon summaries
- Sermon archive
- Discussion question generation
- Additional language support

These are future directions—not current features.

## Project Goals

- **Reliable over feature-rich** — captions should work when the service starts
- **Simple enough for church volunteers** — minimal training, minimal friction
- **Modern web architecture** — maintainable, deployable, and extensible
- **Open source** — built for and with the church community
- **Designed for churches** — optimized for real worship environments, not demos

## Development Philosophy

- Build the smallest useful feature first
- Optimize for Sunday morning reliability
- Avoid unnecessary complexity

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) |
| UI | [React](https://react.dev) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |

## Development Status

**Early MVP — UI foundation in place, live captioning not yet implemented.**

| Area | Status |
| --- | --- |
| Admin page | Done |
| Audience page | Done |
| QR code for mobile viewing | Done |
| Glossary input | Done |
| Browser microphone capture | Not started |
| Live subtitles | Not started |

See [ROADMAP.md](./ROADMAP.md) for the full phased plan.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) for the operator interface, or [http://localhost:3000/captions](http://localhost:3000/captions) for the audience view.

### Build

```bash
npm run build
npm start
```

## Roadmap

Progress and upcoming work are tracked in [ROADMAP.md](./ROADMAP.md).

## Contributing

Contributions are welcome. This project is in early development, and guidelines are still being defined.

If you would like to help:

1. Open an issue to discuss a bug or feature
2. Fork the repository and open a pull request
3. Keep changes focused on the current MVP scope

More detailed contribution guidelines will be added as the project matures.

## License

License information will be added soon.
