# Chunky Crayon - Social Media Strategy

_Created: January 10, 2026_ | _Last Updated: January 10, 2026_

---

## Overview

Automated daily social media posting to drive traffic and engagement. Each day's coloring page is posted across platforms with platform-optimized content.

---

## Daily Content Source

**What gets posted:** The most recent DAILY coloring page with animation.

```
ColoringImage where:
  - generationType: DAILY
  - animationUrl: not null (for video posts)
  - svgUrl: not null (for image posts)
```

---

## Platform Strategy

### Instagram (2 Posts per Day)

| Post Type | Content              | Purpose               | API       |
| --------- | -------------------- | --------------------- | --------- |
| **Reel**  | 9:16 animated video  | Engagement, discovery | Graph API |
| **Image** | Static coloring page | Search, saves         | Graph API |

**Current Implementation:**

- Cron job posts both Reel and Image
- AI-generated captions with hashtags
- Links to coloring page on website

---

### Pinterest (2 Posts per Day)

| Post Type     | Content              | Board             | Purpose               |
| ------------- | -------------------- | ----------------- | --------------------- |
| **Video Pin** | 9:16 animated video  | "Coloring Videos" | Engagement, CTR       |
| **Image Pin** | Static coloring page | "Coloring Pages"  | Search traffic, saves |

**Why Post Both:**

| Metric           | Video Pins    | Image Pins     |
| ---------------- | ------------- | -------------- |
| CTR              | 20% higher    | Baseline       |
| Engagement       | 3x better     | Good for saves |
| Search Discovery | Lower         | Higher         |
| User Intent      | Entertainment | Download/print |

**Research Finding:** Video pins get more clicks and engagement, but users searching for "coloring pages" want to see the actual printable. Post both to capture different user journeys.

**Sources:**

- [Yans Media - Pinterest Video Stats](https://www.yansmedia.com/blog/pinterest-video-stats)
- [Sprout Social - Pinterest Videos](https://sproutsocial.com/insights/pinterest-videos/)

---

### Pinterest Board Strategy

**Recommendation: Use Separate Boards**

Pinterest now shows boards in search results (25% of SEO traffic goes to boards). Each board should be niche-specific with keyword-rich titles.

**Board Structure:**

| Board   | Content Type | SEO Title                                   |
| ------- | ------------ | ------------------------------------------- |
| Board 1 | Video Pins   | "Kids Coloring Page Videos - Watch & Color" |
| Board 2 | Image Pins   | "Free Printable Coloring Pages for Kids"    |

**Why Separate Boards:**

1. **Different user intent** - Video watchers vs. printable seekers
2. **SEO optimization** - Each board ranks for different keywords
3. **Avoid spam flags** - Posting same content to multiple boards is flagged as spam ([MadPin Media](https://madpinmedia.com/what-pinterest-boards-you-should-have-to-rank-faster/))
4. **Better organization** - Clear content types help Pinterest categorize

**Alternative: Theme-Based Boards (Future)**

As content grows, consider theme-based boards:

- "Animal Coloring Pages"
- "Dinosaur Coloring Pages"
- "Holiday Coloring Pages"
- "Educational Coloring Pages"

Each theme board would contain both videos and images for that theme.

**Sources:**

- [Simple Pin Media - Board Sections Guide](https://www.simplepinmedia.com/how-to-use-pinterest-board-sections/)
- [MadPin Media - Pinterest Boards Strategy](https://madpinmedia.com/what-pinterest-boards-you-should-have-to-rank-faster/)
- [Heather Farris - Pinterest Board Strategy](https://heatherfarris.com/pinterest-board-strategy/)

---

### TikTok (1 Post per Day)

| Post Type | Content             | Purpose                     |
| --------- | ------------------- | --------------------------- |
| **Video** | 9:16 animated video | Engagement, viral potential |

**Current Status:** Pending API approval (sandbox mode)

**Posting Flow:**

1. Use Direct Post API with PULL_FROM_URL
2. TikTok fetches video from R2 storage
3. Posts as private (sandbox) → public (after audit)

---

## Implementation Summary

### Daily Cron Schedule

```
Platform     | Post 1 (Video)      | Post 2 (Image)
-------------|--------------------|-----------------
Instagram    | Reel (morning)      | Image (afternoon)
Pinterest    | Video Pin           | Image Pin
TikTok       | Video               | N/A
```

### API Endpoints

| Platform        | Endpoint                      | Purpose                   |
| --------------- | ----------------------------- | ------------------------- |
| Main Cron       | `/api/social/post`            | Posts to all platforms    |
| Pinterest Video | `/api/social/pinterest/video` | Manual video pin (admin)  |
| TikTok          | `/api/social/tiktok/post`     | Manual video post (admin) |

### Current Implementation in `/api/social/post`

| Platform  | Post 1         | Post 2                                       |
| --------- | -------------- | -------------------------------------------- |
| Instagram | Carousel/Image | Reel (video)                                 |
| Facebook  | Image          | Video                                        |
| Pinterest | Image          | Video (requires `PINTEREST_BOARD_ID_VIDEOS`) |

---

## Pinterest Video Pin Implementation (DONE)

Video posting added to `/api/social/post/route.ts`. Posts to separate board for videos.

**How it works:**

- Image pin posts to `PINTEREST_BOARD_ID` (existing)
- Video pin posts to `PINTEREST_BOARD_ID_VIDEOS` (new - only posts if env var is set)

**Environment Variables:**

```
PINTEREST_BOARD_ID=xxx           # For image pins (existing)
PINTEREST_BOARD_ID_VIDEOS=xxx    # For video pins (add this)
```

**To enable video posting:**

1. Create a new Pinterest board for videos (e.g., "Kids Coloring Page Videos")
2. Get the board ID from Pinterest
3. Add `PINTEREST_BOARD_ID_VIDEOS` to your environment variables

---

## Content Best Practices

### Pinterest Pins

| Aspect       | Recommendation                                      |
| ------------ | --------------------------------------------------- |
| Aspect Ratio | 2:3 vertical (1000x1500) for images, 9:16 for video |
| Colors       | Red/orange get 2x more repins than blue             |
| Text         | Minimal overlay, clean designs                      |
| Description  | SEO keywords, no hashtags needed                    |
| Link         | Always link to coloring page on site                |

### Instagram

| Aspect   | Recommendation                      |
| -------- | ----------------------------------- |
| Reels    | 9:16 vertical, 6-15 seconds optimal |
| Images   | 1:1 square or 4:5 portrait          |
| Captions | Engaging, with hashtags (15-20)     |
| CTAs     | "Link in bio", "Save for later"     |

### TikTok

| Aspect   | Recommendation                  |
| -------- | ------------------------------- |
| Video    | 9:16 vertical, under 60 seconds |
| Caption  | Short, catchy (under 150 chars) |
| Hashtags | 3-5 relevant tags               |
| Privacy  | SELF_ONLY until audit approved  |

---

## Metrics to Track

| Metric          | Pinterest    | Instagram    | TikTok       |
| --------------- | ------------ | ------------ | ------------ |
| Impressions     | ✓            | ✓            | ✓            |
| Saves/Repins    | ✓            | ✓            | -            |
| Clicks          | ✓            | -            | -            |
| Views           | Video only   | Reels        | ✓            |
| Website Traffic | UTM tracking | UTM tracking | UTM tracking |

---

## Tasks

### Immediate

- [x] Pinterest image pin in cron (`/api/social/post`)
- [x] Pinterest video pin endpoint (manual - `/api/social/pinterest/video`)
- [x] TikTok video post endpoint (manual - `/api/social/tiktok/post`)
- [x] Admin page for manual posting
- [x] Disconnect functionality
- [x] Add video posting to `/api/social/post` Pinterest section
- [ ] Create second Pinterest board for video pins
- [ ] Add `PINTEREST_BOARD_ID_VIDEOS` env var

### Future

- [ ] Theme-based Pinterest boards
- [ ] A/B test video vs image performance
- [ ] Automated performance reporting
- [ ] Best time to post optimization

---

## References

- [Pinterest Video Stats 2025](https://www.yansmedia.com/blog/pinterest-video-stats)
- [Pinterest Best Practices 2025](https://louisem.com/251174/pinterest-marketing-practices)
- [Pinterest Board Strategy](https://madpinmedia.com/what-pinterest-boards-you-should-have-to-rank-faster/)
- [Sprout Social - Pinterest Videos](https://sproutsocial.com/insights/pinterest-videos/)
- [CoSchedule - Pinterest Engagement](https://coschedule.com/blog/pinterest-engagement-tactics)
