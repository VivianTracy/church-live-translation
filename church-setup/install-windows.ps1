$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "Church Caption — Windows setup"
Write-Host "Project: $RootDir"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install LTS from https://nodejs.org"
  exit 1
}

Write-Host "Node $(node --version)"
Write-Host "npm $(npm --version)"
Write-Host ""

Set-Location $RootDir
npm install

$EnvFile = Join-Path $RootDir ".env.local"
$ExampleFile = Join-Path $RootDir "church-setup/env.example"

if (-not (Test-Path $EnvFile)) {
  Copy-Item $ExampleFile $EnvFile
  Write-Host "Created .env.local from church-setup/env.example — add your API keys."
} else {
  Write-Host ".env.local already exists — skipped."
}

$TranscriptsDir = Join-Path $RootDir "transcripts"
New-Item -ItemType Directory -Force -Path $TranscriptsDir | Out-Null

Write-Host ""
Write-Host "Windows setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Install VB-Audio Virtual Cable (if using OBS audio): https://vb-audio.com/Cable/"
Write-Host "  2. Edit .env.local with your OPENAI_API_KEY"
Write-Host "  3. npm run dev   (or: npm run build && npm run start for production)"
Write-Host "  4. Open http://localhost:3000/operator-live in Chrome or Edge"
Write-Host "  5. Click Allow access & refresh — input/output devices are detected automatically"
Write-Host "  6. Full Windows guide: church-setup/README.md"
