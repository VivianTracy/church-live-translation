#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Church Caption — Mac setup"
echo "Project: $ROOT_DIR"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install LTS from https://nodejs.org"
  exit 1
fi

echo "Node $(node --version)"
echo "npm $(npm --version)"
echo

cd "$ROOT_DIR"
npm install

if [[ ! -f .env.local ]]; then
  cp church-setup/env.example .env.local
  echo "Created .env.local from church-setup/env.example — add your API keys."
else
  echo ".env.local already exists — skipped."
fi

mkdir -p transcripts

echo
echo "Mac setup complete."
echo
echo "Next steps:"
echo "  1. Install BlackHole 2ch: https://existential.audio/blackhole/"
echo "  2. Edit .env.local with API keys"
echo "  3. npm run dev"
echo "  4. Open http://localhost:3000/operator-openai"
echo "  5. See church-setup/obs/browser-source.md for OBS"
echo "  6. Read church-setup/README-SUNDAY.md before Sunday"
