-- Add a 60s trimmed copy of the demo reel for IG/FB Stories.
-- Instagram Stories cap videos at 60s (per Graph API v22.0+); our reels
-- are ~69s so they fail upload with error 2207082 when used as-is. The
-- worker now generates a trimmed mp4 alongside the full reel.
ALTER TABLE "coloring_images" ADD COLUMN "demoReelStoryUrl" TEXT;
