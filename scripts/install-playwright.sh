#!/usr/bin/env bash
set -euo pipefail

# `timeout` cannot signal the apt-get that install-deps starts through sudo,
# so after a timeout it keeps downloading and holds the dpkg lock, which fails
# the retry. Stop it as root, wait for apt and dpkg to exit, and finish any
# package setup it interrupted.
stop_leftover_apt() {
  sudo pkill -x apt-get || true
  for _ in $(seq 30); do
    pgrep -x 'apt-get|dpkg' >/dev/null || break
    sleep 2
  done
  sudo dpkg --configure -a || true
}

# Keep a slow or unavailable apt mirror from consuming the entire job timeout.
# The install usually takes under a minute. Retry once, then fail clearly
# instead of testing with missing libraries.
for attempt in 1 2; do
  if timeout --kill-after=10s 5m npx --no-install playwright install-deps "$@"; then
    npx --no-install playwright install "$@"
    exit 0
  fi
  echo "::warning::Playwright system dependency installation failed (attempt $attempt/2)"
  if [ "$attempt" -eq 1 ]; then
    stop_leftover_apt
  fi
done
echo "::error::Unable to install Playwright system dependencies"
exit 1
