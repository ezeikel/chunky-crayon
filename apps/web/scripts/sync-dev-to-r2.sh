#!/bin/bash
# Sync Vercel Blob Development → R2 chunky-crayon-dev

set -e

cd "$(dirname "$0")/.."

# Load R2 credentials from .env.local
export $(grep -E "^R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY|ENDPOINT)" .env.local | xargs)

# Target the development R2 bucket
export R2_BUCKET=chunky-crayon-dev

# Dev/Preview Vercel Blob token
export PROD_BLOB_TOKEN="vercel_blob_rw_fC45j1BNCYyvDRos_YM7trPcsWQQzz7fpET88JJ7ExLnpu0"

echo "Syncing Vercel Blob → R2 chunky-crayon-dev..."
echo "R2_BUCKET: $R2_BUCKET"
echo ""

pnpm tsx utils/backupVercelBlobsToR2.ts
