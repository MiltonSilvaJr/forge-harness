#!/usr/bin/env bash
# Gate W0.2 — verifies the frozen snapshot against MANIFEST.sha256.
# The snapshot is read-only by convention: any drift here means the reference
# baseline was touched, which invalidates the Claude compatibility contract.
# Output contract: single line "OK" (exit 0) or "FAIL (...)" (exit 1).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SNAP="$ROOT/snapshot"
MANIFEST="$SNAP/MANIFEST.sha256"

if [[ ! -f "$MANIFEST" ]]; then
  echo "FAIL (missing $MANIFEST)"
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

(cd "$SNAP" && find project-bootstrap init-project.md -type f ! -name '.DS_Store' -print0 \
  | xargs -0 shasum -a 256 | LC_ALL=C sort -k2) > "$tmp"

if diff -q <(LC_ALL=C sort -k2 "$MANIFEST") "$tmp" >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL (snapshot drift detected vs MANIFEST.sha256 — run 'diff' manually to inspect)"
  exit 1
fi
