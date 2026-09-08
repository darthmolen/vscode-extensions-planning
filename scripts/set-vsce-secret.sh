#!/usr/bin/env bash
# Push the VS Code Marketplace PAT from .env into the repository's `VSCE_PAT`
# GitHub Actions secret — without ever printing the value.
#
# Usage:  ./scripts/set-vsce-secret.sh [path-to-.env]   (default: ./.env)
# Reads:  MarketplaceAdoPat=<pat>  from the env file.
# Needs:  gh authenticated with admin on darthmolen/vscode-extensions-planning.
#
# The PAT is an Azure DevOps token scoped to Marketplace > Manage. It is tied to
# the publisher account, not to any one extension, so the same value publishes
# every extension under src/.

set -euo pipefail

ENV_FILE="${1:-.env}"
ENV_KEY="MarketplaceAdoPat"
SECRET_NAME="VSCE_PAT"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: env file not found: $ENV_FILE" >&2
  exit 1
fi

# Grab the first matching line (or empty). Never echo it.
line="$(grep -m1 "^${ENV_KEY}=" "$ENV_FILE" || true)"
if [ -z "$line" ]; then
  echo "error: ${ENV_KEY}= not found in ${ENV_FILE}" >&2
  exit 1
fi

# Strip the "KEY=" prefix and any trailing CR/LF; pipe the bare value to gh so it
# never reaches argv, the process list, or the shell history.
value="${line#${ENV_KEY}=}"
value="${value%$'\r'}"
if [ -z "$value" ]; then
  echo "error: ${ENV_KEY} is empty in ${ENV_FILE}" >&2
  exit 1
fi

printf '%s' "$value" | gh secret set "$SECRET_NAME"

echo "Set GitHub Actions secret ${SECRET_NAME} (${#value} chars) from ${ENV_FILE}:${ENV_KEY}"
echo "(value never printed). Current secrets:"
gh secret list
