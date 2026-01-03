# Cloudflare R2 Storage Migration

## Overview

This document describes the migration from Vercel Blob Storage to Cloudflare R2 for all file storage needs.

## Why R2?

| Metric | Vercel Blob | Cloudflare R2 | Savings |
|--------|-------------|---------------|---------|
| Storage | $0.23/GB/mo | $0.015/GB/mo | **~15x cheaper** |
| Egress | $0.15/GB | **Free** | **100%** |
| Class A ops | Included | $4.50/million | Minimal |
| Class B ops | Included | $0.36/million | Minimal |

At scale, R2 significantly reduces costs, especially with free egress for image-heavy applications.

## Architecture

### Storage Module

Location: `lib/storage/`

```
lib/storage/
├── index.ts    # Re-exports for clean imports
└── r2.ts       # R2 client using AWS S3 SDK
```

### API

The R2 module provides a drop-in replacement for `@vercel/blob`:

```typescript
import { put, del, list, exists } from '@/lib/storage';

// Upload a file
const { url, pathname } = await put('uploads/image.webp', buffer, {
  access: 'public',
  contentType: 'image/webp',
});

// Delete a file
await del('uploads/image.webp');
// or
await del('https://r2.example.com/uploads/image.webp');

// List files
const { blobs, hasMore, cursor } = await list({
  prefix: 'uploads/',
  limit: 100,
});

// Check if file exists
const fileExists = await exists('uploads/image.webp');
```

## Environment Variables

Most R2 variables are already configured (used by backup utility). Only one new variable needed:

```bash
# Already configured (existing)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET=chunky-crayon

# NEW - Public URL for the bucket (custom domain or R2.dev URL)
R2_PUBLIC_URL=https://assets.chunkycrayon.com
```

## Files Using Storage

| File | Operations | Purpose |
|------|------------|---------|
| `app/actions/coloring-image.ts` | put, del | Coloring images (webp, svg, qr) |
| `app/actions/photo-to-coloring.ts` | put, del | Photo-to-coloring generation |
| `app/actions/ambient-sound.ts` | put | Ambient audio files |
| `app/actions/saved-artwork.ts` | put | User saved artwork |
| `app/actions/share-artwork.ts` | put | Shared artwork for social |
| `app/actions/loading-audio.ts` | put | Colo voice audio |
| `lib/ai/image-providers.ts` | put | Temp AI-generated images |
| `utils/traceImage.ts` | put | SVG retracing |
| `app/api/social/post/route.ts` | put, del | Social media temp images |
| `scripts/generate-ambient-sounds.ts` | put | Batch ambient sound generation |

## Storage Path Structure

```
uploads/
├── coloring-images/{id}/
│   ├── image.webp       # Main coloring image
│   ├── image.svg        # SVG trace for coloring
│   ├── qr-code.svg      # QR code for PDF
│   └── ambient.mp3      # Background soundscape
├── saved-artwork/{userId}/{coloringImageId}/
│   └── {timestamp}.png  # User's colored artwork
└── shared-artwork/
    └── {shareId}.png    # Temporary social sharing

temp/
├── {timestamp}-{random}.png      # AI generation intermediates
├── loading-audio/
│   └── {timestamp}-{random}.mp3  # Colo voice clips
└── social/{platform}/
    └── {timestamp}-{random}.jpg  # Social media posts
```

## Migration Steps

### 1. Set Up R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create a bucket (e.g., `chunky-crayon`)
3. Enable public access or set up a custom domain
4. Create an API token with read/write permissions

### 2. Sync Existing Blobs

Use the existing backup utility to sync all Vercel blobs to R2:

```bash
# Set environment variables
export PROD_BLOB_TOKEN=your-vercel-blob-token
export R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
export R2_BUCKET=chunky-crayon
export R2_ACCESS_KEY_ID=xxx
export R2_SECRET_ACCESS_KEY=xxx

# Run backup
pnpm tsx apps/web/utils/backupVercelBlobsToR2.ts
```

### 3. Deploy Code Changes

The code changes in this PR update all storage imports to use R2.

### 4. Update Database URLs

After deploying, run the migration script to update stored URLs:

```bash
# Preview changes (dry run)
DOTENV_CONFIG_PATH=apps/web/.env.local \
  pnpm tsx -r dotenv/config apps/web/scripts/migrate-blob-urls-to-r2.ts --dry-run

# Apply changes
DOTENV_CONFIG_PATH=apps/web/.env.local \
  pnpm tsx -r dotenv/config apps/web/scripts/migrate-blob-urls-to-r2.ts
```

### 5. Cleanup (Optional)

After confirming R2 works correctly:

1. Remove `@vercel/blob` from `package.json`
2. Archive or delete legacy utilities:
   - `utils/backupVercelBlobsToR2.ts`
   - `utils/syncBlobStorage.ts`
   - `utils/syncBlobStorageReverse.ts`
   - `app/api/utils/blob/backup/route.ts`

## Rollback Plan

If issues arise:

1. Revert the import changes (change `@/lib/storage` back to `@vercel/blob`)
2. The database URLs don't need to change if blobs exist in both locations
3. Deploy the reverted code

## Testing Checklist

- [ ] Create new coloring image (uploads webp, svg, qr-code)
- [ ] Generate ambient sound for image
- [ ] Save colored artwork to gallery
- [ ] Share artwork to social media
- [ ] Photo-to-coloring generation
- [ ] Loading audio plays during generation
- [ ] Verify all URLs resolve correctly
- [ ] Run migration script on development database
