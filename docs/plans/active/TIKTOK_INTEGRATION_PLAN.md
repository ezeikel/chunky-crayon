# TikTok Integration Plan

## Overview

Add TikTok as a social media posting platform alongside existing Instagram, Facebook, and Pinterest integrations. Leverage the existing 9:16 vertical video format already generated for Instagram Reels.

## Why TikTok?

- **Same video format**: Already generating 9:16 vertical videos (1080x1920) for Instagram Reels
- **Audience fit**: TikTok's younger demographic aligns with kids coloring content
- **Discovery potential**: Strong algorithm for content discovery
- **Cross-posting efficiency**: Minimal additional effort once set up

## TikTok Content Posting API

### Two Posting Options

1. **Direct Post API** - Posts directly to user's TikTok profile (recommended)
2. **Upload to Inbox API** - Uploads as draft for user to edit/publish manually

We'll use **Direct Post API** for automated posting.

### API Requirements

| Requirement  | Details                                                    |
| ------------ | ---------------------------------------------------------- |
| OAuth 2.0    | User authorization required for `video.publish` scope      |
| App Review   | Required for public visibility (unaudited = private only)  |
| Rate Limits  | 6 requests/min per user, ~15 posts/day per creator         |
| Video Upload | URL-based (`PULL_FROM_URL`) or file upload (`FILE_UPLOAD`) |

### Video Specifications

| Spec         | Requirement                | Our Current |
| ------------ | -------------------------- | ----------- |
| Format       | MP4 + H.264 (recommended)  | MP4         |
| Aspect Ratio | 9:16 (vertical)            | 9:16        |
| Resolution   | 1080x1920 recommended      | 1080x1920   |
| Duration     | 1s - 60min (9-15s optimal) | 6 seconds   |
| File Size    | Up to 500MB (web)          | ~5-10MB     |
| Frame Rate   | Up to 60 FPS               | Veo default |

**Our videos already meet all TikTok requirements.**

## App Approval Process

### Step 1: Register Developer App

1. Create account at [TikTok for Developers](https://developers.tiktok.com/)
2. Create new app with:
   - Custom app name (not containing "TikTok")
   - Official website URL (chunkycrayon.com)
   - Privacy Policy link
   - Terms of Service link

### Step 2: Request Scopes

Required scopes:

- `video.publish` - Post videos to TikTok
- `user.info.basic` - Get user profile info (optional)

### Step 3: Submit for Review

Requirements:

- Detailed explanation of how API is used
- Demo video showing end-to-end flow
- Valid website with visible Privacy Policy and ToS

### Step 4: Audit (for public posts)

**Without audit:**

- Max 5 users can post in 24 hours
- All posts are private (`SELF_ONLY` visibility)
- Account must be set to private

**After audit:**

- Public posting enabled
- Higher user caps based on usage estimates

## Implementation Plan

### Phase 1: Developer Setup (Manual)

- [ ] Create TikTok Developer account
- [ ] Register app and configure settings
- [ ] Request `video.publish` scope
- [ ] Submit for initial review
- [ ] Store credentials in environment variables

### Phase 2: OAuth Integration

**New files:**

- `apps/web/app/api/auth/tiktok/route.ts` - OAuth callback handler
- `apps/web/lib/tiktok.ts` - TikTok API client

**Database changes:**

```prisma
model TikTokAccount {
  id           String   @id @default(cuid())
  accessToken  String
  refreshToken String
  expiresAt    DateTime
  openId       String   @unique // TikTok user ID
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**OAuth Flow:**

1. Redirect to TikTok authorization URL
2. User grants `video.publish` permission
3. Exchange code for access token
4. Store tokens in database
5. Implement token refresh logic

### Phase 3: Video Posting

**Add to `apps/web/app/api/social/post/route.ts`:**

```typescript
const postToTikTok = async (videoUrl: string, caption: string) => {
  // Step 1: Initialize upload with PULL_FROM_URL
  const initResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    },
  );

  // Step 2: Poll for completion
  const { publish_id } = await initResponse.json();
  return pollForPublishStatus(publish_id);
};
```

### Phase 4: Caption Generation

Add TikTok-specific caption generation in `apps/web/app/actions/social.ts`:

```typescript
const TIKTOK_CAPTION_SYSTEM = `Generate a TikTok caption for a kids coloring page video.
- Keep it short and engaging (under 150 chars ideal)
- Use 3-5 relevant hashtags
- Include call-to-action (e.g., "Link in bio!")
- Kid and parent friendly tone`;
```

### Phase 5: Cron Integration

Update `apps/web/app/api/cron/social-post/route.ts`:

```typescript
// Add TikTok to platforms array
const platforms = ["instagram", "facebook", "pinterest", "tiktok"];

// Add TikTok posting logic
if (platforms.includes("tiktok")) {
  const tiktokResult = await postToTikTok(animationUrl, tiktokCaption);
  results.tiktok = tiktokResult;
}
```

## Environment Variables

```env
# TikTok API
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_ACCESS_TOKEN=your_access_token
TIKTOK_REFRESH_TOKEN=your_refresh_token
```

## Timeline Estimate

| Phase                       | Effort                          |
| --------------------------- | ------------------------------- |
| Phase 1: Developer Setup    | Manual (1-2 weeks for approval) |
| Phase 2: OAuth Integration  | 1-2 days                        |
| Phase 3: Video Posting      | 1 day                           |
| Phase 4: Caption Generation | 0.5 day                         |
| Phase 5: Cron Integration   | 0.5 day                         |

**Total dev work:** ~3-4 days
**Blocking:** TikTok app approval (1-2 weeks)

## Risks & Considerations

### App Approval

- TikTok has stricter review process than Meta
- May require demo video and detailed documentation
- Audit required for public posting (additional review)

### Rate Limits

- 6 requests/min per user token
- ~15 posts/day per creator account
- Need to handle rate limiting gracefully

### Token Management

- Access tokens expire (need refresh logic)
- Single account posting (not multi-tenant initially)

### Content Visibility

- Without audit: posts are private only
- Need to complete audit for public visibility
- Consider starting with private for testing

## Demo Video Recording Tips

When recording demo videos for TikTok (and Pinterest) API approval:

1. **Start screen recording before clicking "Connect"**
2. **Show the full OAuth flow:**
   - Click "Connect TikTok" button
   - Login to TikTok (if not already logged in)
   - Review and accept permissions
   - Redirect back to your app
   - Show the "Connected" status in your UI
3. **After connecting, click "Post Video Now"** to demonstrate posting
4. **Wait for success confirmation** in your app
5. **Open the TikTok app/website** to show the post appeared
6. **Keep recording until you verify** the post is visible in the platform UI

**Important for TikTok:**

- Posts will appear as private (`SELF_ONLY`) in sandbox mode - this is expected
- Your TikTok account must be set to private while using the unaudited app
- Mention in your submission that you're in sandbox mode

## Post-Approval Tasks

After TikTok approves your Content Posting API access:

### 1. Update Privacy Level

Change from sandbox mode to public posting:

**File:** `apps/web/app/api/social/tiktok/post/route.ts` (line ~186)

```typescript
// Change from:
privacy_level: 'SELF_ONLY',

// To:
privacy_level: 'PUBLIC_TO_EVERYONE',
```

### 2. Set TikTok Account Back to Public

Once approved, you can set your TikTok account visibility back to public.

### 3. Add TikTok to Cron Schedule

Add automated TikTok posting to `apps/web/vercel.json`:

```json
{
  "path": "/api/social/post?platform=tiktok",
  "schedule": "15 16 * * 1-5"
}
```

### 4. Monitor Rate Limits

- 6 requests/min per user token
- ~15 posts/day per creator account
- Implement error handling for rate limit responses

## Alternative: Manual Cross-Posting

If API approval is delayed, consider:

1. Download video from R2
2. Manually upload to TikTok
3. Use same caption format

This is temporary until API access is approved.

## References

- [TikTok Content Posting API Overview](https://developers.tiktok.com/products/content-posting-api/)
- [Direct Post API Reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [Media Transfer Guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide)
- [App Review Guidelines](https://developers.tiktok.com/doc/app-review-guidelines)
- [Scopes Overview](https://developers.tiktok.com/doc/scopes-overview)
- [TikTok Video Size Guide](https://riverside.fm/blog/tiktok-video-size)
