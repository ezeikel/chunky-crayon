# Pinterest Video Pin Integration Plan

## Overview

Add video pin support to Pinterest alongside existing image pins. Our 9:16 videos already meet Pinterest's specs.

## Current State

- Image pins working via Pinterest API v5
- Trial access (limited to sandbox)
- **Rejected on first review** - need better demo video

## Video Pin Specifications

Our videos already meet all requirements:

| Spec         | Pinterest Requirement      | Our Current |
| ------------ | -------------------------- | ----------- |
| Aspect Ratio | 9:16 (recommended)         | 9:16 ✓      |
| Resolution   | 1080x1920                  | 1080x1920 ✓ |
| Format       | MP4, MOV, M4V              | MP4 ✓       |
| Duration     | 4s - 15min (6-15s optimal) | 6 seconds ✓ |
| File Size    | Max 2GB                    | ~5-10MB ✓   |
| Encoding     | H.264 or H.265             | H.264 ✓     |

## API Requirements

### Video Pin Creation Flow

1. **Register video** - Declare intent to upload
2. **Upload video** - Send the MP4 file
3. **Create pin** - Attach video to pin with metadata
4. **Set thumbnail** - Required cover image (PNG/JPG, same dimensions as video)

### Thumbnail Requirement

Pinterest requires a cover image for video pins:

- Format: PNG or JPG
- Dimensions: Same as video (1080x1920)
- Max size: 10MB

**Solution**: Use first frame of video or the source coloring page image resized to 9:16.

## Implementation

### Changes to `apps/web/app/api/social/post/route.ts`

```typescript
/**
 * Post a video pin to Pinterest.
 * Requires: video URL, cover image, title, description
 */
const postVideoToPinterest = async (
  videoUrl: string,
  coverImageUrl: string,
  title: string,
  description: string,
  coloringImageId: string,
) => {
  const accessToken = await getPinterestAccessToken();

  // Step 1: Register media upload
  const registerResponse = await fetch("https://api.pinterest.com/v5/media", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media_type: "video",
    }),
  });

  const { media_id, upload_url } = await registerResponse.json();

  // Step 2: Upload video file
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = await videoResponse.arrayBuffer();

  await fetch(upload_url, {
    method: "PUT",
    body: videoBuffer,
    headers: {
      "Content-Type": "video/mp4",
    },
  });

  // Step 3: Create pin with video
  const pinResponse = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: process.env.PINTEREST_BOARD_ID,
      media_source: {
        source_type: "video_id",
        cover_image_url: coverImageUrl,
        media_id: media_id,
      },
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      link: `https://chunkycrayon.com/coloring/${coloringImageId}`,
      alt_text: `${title} - Animated coloring page from Chunky Crayon`,
    }),
  });

  const data = await pinResponse.json();
  return data.id;
};
```

### Cover Image Generation

Add function to create 9:16 cover image from coloring page:

```typescript
const createPinterestCoverImage = async (svgUrl: string): Promise<string> => {
  const svgResponse = await fetch(svgUrl);
  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  // Convert to 9:16 vertical (same as video)
  const coverBuffer = await sharp(svgBuffer)
    .flatten({ background: "#ffffff" })
    .resize(1080, 1920, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const tempFileName = `temp/social/pinterest/${Date.now()}-cover.jpg`;
  const { url } = await put(tempFileName, coverBuffer, {
    access: "public",
    contentType: "image/jpeg",
  });

  return url;
};
```

## App Review Requirements

### Why We Got Rejected

Pinterest requires:

1. Demo video showing complete end-to-end flow
2. Clear explanation of API usage
3. Production-ready website with visible Privacy Policy & ToS

### Demo Video Recording Tips

1. **Start screen recording before clicking "Connect"**
2. **Show the full OAuth flow:**
   - Click "Connect Pinterest" button
   - Login to Pinterest (if not already logged in)
   - Review and accept permissions
   - Redirect back to your app
   - Show the "Connected" status in your UI
3. **After connecting, click "Post Video Now"** to demonstrate posting
4. **Wait for success confirmation** in your app
5. **Open Pinterest app/website** to show the video pin appeared
6. **Keep recording until you verify** the pin is visible on your board

### Better Demo Video Should Show

1. **Website overview** - chunkycrayon.com homepage
2. **Content creation** - How coloring pages are generated
3. **Video generation** - Veo creating the animation
4. **Pinterest integration** - API posting the video pin
5. **Result** - Pin appearing on Pinterest board

### Demo Video Script

```
[Screen recording with voiceover]

1. "Chunky Crayon is a kids coloring website that creates daily coloring pages"
   [Show homepage, browse coloring pages]

2. "Each coloring page is automatically animated using AI"
   [Show video playing on the site]

3. "We use the Pinterest API to share these animations as video pins"
   [Show API call in developer tools or logs]

4. "The video pin links back to our website where kids can download and color"
   [Show the pin on Pinterest board, click through to website]

5. "This helps parents discover our free educational content"
   [Show Privacy Policy and Terms of Service links in footer]
```

## Tasks

### Phase 1: Resubmit for Review

- [ ] Record better demo video (2-3 minutes)
- [ ] Show sandbox environment working
- [ ] Highlight Privacy Policy and ToS on website
- [ ] Submit for review with detailed explanation

### Phase 2: Implementation (after approval)

- [ ] Add `postVideoToPinterest` function
- [ ] Add `createPinterestCoverImage` function
- [ ] Update social post route to include Pinterest video
- [ ] Test in production

## Environment Variables

Already configured:

- `PINTEREST_ACCESS_TOKEN` - OAuth token
- `PINTEREST_BOARD_ID` - Target board for pins

## Timeline

| Phase                | Effort            |
| -------------------- | ----------------- |
| Demo video recording | 1-2 hours         |
| Resubmission         | 1 week for review |
| Implementation       | 2-3 hours         |

## References

- [Pinterest API v5 - Create Pins](https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/)
- [Pinterest API - Media Upload](https://developers.pinterest.com/docs/api/v5/media-create/)
- [Pinterest Video Specs](https://www.capcut.com/resource/pinterest-video-specs/)
