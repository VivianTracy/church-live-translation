#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Church Translation setup"
echo "Choose your streaming computer OS:"
echo "  1) Mac"
echo "  2) Windows"
echo
read -r -p "Enter 1 or 2: " choice

case "$choice" in
  1)
    exec "$SCRIPT_DIR/install-mac.sh"
    ;;
  2)
    echo
    echo "On Windows, run in PowerShell:"
    echo "  cd church-setup"
    echo "  powershell -ExecutionPolicy Bypass -File install-windows.ps1"
    ;;
  *)
    echo "Invalid choice."
    exit 1
    ;;
esac
