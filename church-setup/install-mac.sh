#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Church Translation — Mac setup"
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
  echo "Created .env.local from church-setup/env.example — add the Supabase keys."
else
  echo ".env.local already exists — skipped."
fi

echo
echo "Mac setup complete."
echo
echo "Next steps:"
echo "  1. Install BlackHole 2ch: https://existential.audio/blackhole/"
echo "  2. Edit .env.local with the Supabase keys (church-setup/SUPABASE.md)"
echo "  3. npm run build"
echo "  4. npm run start   (opens Chrome to /operator-live; sign in)"
echo "  5. Daily use (Chinese / English): church-setup/OPERATOR.md"
echo "  6. Public site (Vercel + Supabase + Redis): church-setup/README.md"
