#!/bin/bash
# ==============================================================================
# 🧩 INSTALLATEUR DES PLUGINS & DASHBOARD INTERACTIF NEXTCLOUD (SNAP & STANDARD)
# Cible : https://intranet.evasionsoleil.com
# Usage : sudo bash install-plugins-only.sh
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/install-github-nextcloud.sh" ]; then
  exec bash "$SCRIPT_DIR/install-github-nextcloud.sh" "$@"
fi
