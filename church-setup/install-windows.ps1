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
Write-Host "  1. Install VB-Audio Virtual Cable: https://vb-audio.com/Cable/"
Write-Host "  2. Edit .env.local with API keys"
Write-Host "  3. npm run dev"
Write-Host "  4. Open http://localhost:3000/operator-openai"
Write-Host "  5. See church-setup/obs/browser-source.md for OBS"
Write-Host "  6. Read church-setup/README-SUNDAY.md before Sunday"
