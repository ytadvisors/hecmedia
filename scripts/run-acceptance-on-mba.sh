#!/usr/bin/env bash
set -euo pipefail

# The deployed-DOM acceptance suite belongs on worker-mba: browser work must not
# contend with the iMac queue host.  It intentionally has no deploy credentials.
if [[ "$(hostname -s)" != "worker-mba" ]]; then
  echo "Run this acceptance gate on worker-mba." >&2
  exit 2
fi

STAGING_SITE_URL="${1:-https://development.hecmedia.org}"
case "$STAGING_SITE_URL" in
  https://development.hecmedia.org|https://develop.hecmedia.org) ;;
  *)
    echo "STAGING_SITE_URL must be an approved HTTPS staging host." >&2
    exit 2
    ;;
esac

run_yarn() {
  if command -v yarn >/dev/null 2>&1; then
    yarn "$@"
  else
    # Keep the runner self-contained: do not require a global yarn install.
    npx --yes yarn@1.22.19 "$@"
  fi
}

run_yarn install --frozen-lockfile
run_yarn playwright install chromium
STAGING_SITE_URL="$STAGING_SITE_URL" run_yarn test:acceptance
