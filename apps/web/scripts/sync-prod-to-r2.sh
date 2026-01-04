#!/bin/bash
# Sync Vercel Blob Production → R2 chunky-crayon-prod

set -e

cd "$(dirname "$0")/.."

# Load R2 credentials from .env.local
export $(grep -E "^R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY|ENDPOINT)" .env.local | xargs)

# Target the production R2 bucket
export R2_BUCKET=chunky-crayon-prod

# Production Vercel Blob token
export PROD_BLOB_TOKEN="vercel_blob_rw_x0ODfCKl5uaoySCM_SskirPjdAK9mgtKNEQvnIB6chkXqdW"

echo "Syncing Vercel Blob Production → R2 chunky-crayon-prod..."
echo "R2_BUCKET: $R2_BUCKET"
echo ""

pnpm tsx utils/backupVercelBlobsToR2.ts
