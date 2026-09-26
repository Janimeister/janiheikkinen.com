#!/usr/bin/env bash
set -euo pipefail

# Keep an unavailable apt mirror from consuming the entire job timeout.
# Retry once, then fail clearly instead of testing with missing libraries.
for attempt in 1 2; do
  if timeout --kill-after=10s 2m npx --no-install playwright install-deps "$@"; then
    npx --no-install playwright install "$@"
    exit 0
  fi
  echo "::warning::Playwright system dependency installation failed (attempt $attempt/2)"
done
echo "::error::Unable to install Playwright system dependencies"
exit 1
