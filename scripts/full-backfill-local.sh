#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/prasanna/src/SpeedSuttaReading"
cd "$REPO_ROOT"

mkdir -p .cache logs

if [ ! -d ../bilara-data/.git ]; then
  git clone --branch published --single-branch https://github.com/suttacentral/bilara-data.git ../bilara-data
else
  git -C ../bilara-data fetch origin published
  git -C ../bilara-data checkout published
  git -C ../bilara-data pull --ff-only origin published
fi

TS="$(date +%Y%m%d-%H%M%S)"
PROBE_PID=""
UPLOAD_CONCURRENCY="${UPLOAD_CONCURRENCY:-8}"
SYNC_PROGRESS_EVERY="${SYNC_PROGRESS_EVERY:-50}"

cleanup() {
  if [ -n "${PROBE_PID}" ] && kill -0 "${PROBE_PID}" 2>/dev/null; then
    kill "${PROBE_PID}" || true
  fi
}
trap cleanup EXIT

(
  while true; do
    printf "\n[%s] probe: " "$(date '+%H:%M:%S')"
    for SUTTA_UID in an1.1 dn1 mn10 sn12.2; do
      CODE="$(curl -s -o /dev/null -w "%{http_code}" "https://api.suttaspeed.com/api/v1/sutta/${SUTTA_UID}/text/pli/ms")"
      printf "%s=%s " "$SUTTA_UID" "$CODE"
    done
    sleep 30
  done
) &
PROBE_PID="$!"

BILARA_DATA_DIR=../bilara-data \
  pnpm data:build-index 2>&1 | tee "logs/build-index-${TS}.log"

BILARA_DATA_DIR=../bilara-data \
R2_BUCKET=speedreadsuttas-data \
SYNC_STATE_FILE=.cache/r2-sync-manifest.json \
SYNC_SUMMARY_FILE=.cache/r2-sync-summary.json \
UPLOAD_CONCURRENCY="$UPLOAD_CONCURRENCY" \
SYNC_PROGRESS_EVERY="$SYNC_PROGRESS_EVERY" \
  pnpm data:sync-r2 2>&1 | tee "logs/sync-r2-${TS}.log"

jq . .cache/r2-sync-summary.json

pnpm --filter @palispeedread/worker run deploy 2>&1 | tee "logs/worker-deploy-${TS}.log"
