import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type SocialDigestEntry = {
  platform: string;
  caption: string;
  /** Will the cron auto-post this entry today? false = needs manual posting. */
  willAutoPost: boolean;
  assetType: 'image' | 'video';
  assetUrl?: string;
  /** When the cron is scheduled to fire today, in UTC HH:MM. Undefined for
   *  manual-only entries. */
  scheduledTimeUtc?: string;
};

type SocialDigestEmailProps = {
  // Today's blog post (optional — skipped if blog cron didn't produce one)
  blogTitle?: string;
  blogExcerpt?: string;
  blogImageUrl?: string;
  blogUrl?: string;
  // Daily image (static posts)
  coloringImageTitle: string;
  coloringImageUrl: string;
  dailyImageAssetUrl?: string;
  dailyEntries: SocialDigestEntry[];
  // Demo reel (worker-produced)
  demoReelTitle?: string;
  demoReelUrl?: string;
  demoReelCoverUrl?: string;
  demoReelEntries: SocialDigestEntry[];
  // Content reel — researched stats / facts / tips / myth-busts (replaces
  // the old "Stat Reel" placeholder once content-reels publish cron is live).
  // Optional — section only renders when contentReel is supplied.
  contentReel?: {
    id: string;
    kind: 'STAT' | 'FACT' | 'TIP' | 'MYTH';
    hook: string;
    sourceTitle?: string;
    sourceUrl?: string;
    reelUrl?: string;
    coverUrl?: string;
    /**
     * Per-platform entries with caption + scheduled UTC time + manual
     * flag. Same shape as demoReelEntries; the email renders one card
     * per platform so TikTok (manual) and IG/FB/Pinterest (auto) all
     * share a consistent UI.
     */
    entries?: SocialDigestEntry[];
  };
  timestamp: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const SocialDigestEmail = ({
  blogTitle,
  blogExcerpt,
  blogImageUrl,
  blogUrl,
  coloringImageTitle = "Today's Coloring Page",
  coloringImageUrl = 'https://chunkycrayon.com',
  dailyImageAssetUrl,
  dailyEntries = [],
  demoReelTitle,
  demoReelUrl,
  demoReelCoverUrl,
  demoReelEntries = [],
  contentReel,
  timestamp = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
}: SocialDigestEmailProps) => (
  <Html>
    <Head />
    <Preview>Today&apos;s Posting Brief - {coloringImageTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Link href={baseUrl} style={logoLink}>
            <Text style={logo}>Chunky Crayon</Text>
          </Link>
        </Section>

        {/* Hero */}
        <Section style={hero}>
          <Heading style={heroTitle}>Today&apos;s Posting Brief</Heading>
          <Text style={heroSubtitle}>{timestamp}</Text>
          <Text style={heroNote}>
            Assets ready, captions drafted. Auto-posts fire later today at the
            times shown. Anything marked manual needs a hand.
          </Text>
        </Section>

        {/* ── Section 0: Today's blog post (optional) ── */}
        {(blogTitle || blogUrl) && (
          <Section style={infoSection}>
            <Heading as="h2" style={sectionTitle}>
              📝 Today&apos;s Blog Post
            </Heading>
            {blogTitle && (
              <Text style={paragraph}>
                <strong>{blogTitle}</strong>
              </Text>
            )}
            {blogImageUrl && (
              <Img
                src={blogImageUrl}
                width="552"
                alt={blogTitle ?? 'Featured image'}
                style={blogImage}
              />
            )}
            {blogExcerpt && <Text style={paragraph}>{blogExcerpt}</Text>}
            {blogUrl && (
              <Text style={paragraph}>
                <Link href={blogUrl} style={inlineLink}>
                  Read on site
                </Link>
              </Text>
            )}
          </Section>
        )}

        {/* ── Section 1: Daily Image (static posts) ── */}
        <Section style={infoSection}>
          <Heading as="h2" style={sectionTitle}>
            📌 Daily Image
          </Heading>
          <Text style={paragraph}>
            <strong>{coloringImageTitle}</strong>
          </Text>
          <Text style={paragraph}>
            <Link href={coloringImageUrl} style={inlineLink}>
              View on site
            </Link>
          </Text>
          {dailyImageAssetUrl && (
            <Section style={assetSection}>
              <Text style={paragraph}>
                🖼️ Line Art:{' '}
                <Link href={dailyImageAssetUrl} style={inlineLink}>
                  Download Image
                </Link>
              </Text>
            </Section>
          )}
        </Section>

        {dailyEntries.map((entry, index) => (
          <Section key={`daily-${index}`} style={platformCard}>
            <Text style={platformHeader}>
              <span style={platformName}>{entry.platform}</span>
              <span style={entry.willAutoPost ? badgeAuto : badgeManual}>
                {entry.willAutoPost ? 'auto-posting' : 'manual'}
              </span>
            </Text>
            <Text style={assetTypeText}>
              Asset: {entry.assetType}
              {entry.willAutoPost && entry.scheduledTimeUtc
                ? ` · scheduled ${entry.scheduledTimeUtc} UTC`
                : ''}
            </Text>
            <Text style={captionBlock}>{entry.caption}</Text>
          </Section>
        ))}

        <Hr style={hr} />

        {/* ── Section 2: Demo Reel (worker-produced) ── */}
        {(demoReelUrl || demoReelEntries.length > 0) && (
          <>
            <Section style={infoSection}>
              <Heading as="h2" style={sectionTitle}>
                🎬 Demo Reel
              </Heading>
              {demoReelTitle && (
                <Text style={paragraph}>
                  <strong>{demoReelTitle}</strong>
                </Text>
              )}
              <Section style={assetSection}>
                {demoReelUrl && (
                  <Text style={paragraph}>
                    🎬 Video (mp4):{' '}
                    <Link href={demoReelUrl} style={inlineLink}>
                      Download Video (1080×1920)
                    </Link>
                  </Text>
                )}
                {demoReelCoverUrl && (
                  <Text style={paragraph}>
                    📸 Cover (jpg):{' '}
                    <Link href={demoReelCoverUrl} style={inlineLink}>
                      Download Cover Image
                    </Link>
                  </Text>
                )}
              </Section>
            </Section>

            {demoReelEntries.map((entry, index) => (
              <Section key={`reel-${index}`} style={platformCard}>
                <Text style={platformHeader}>
                  <span style={platformName}>{entry.platform}</span>
                  <span style={entry.willAutoPost ? badgeAuto : badgeManual}>
                    {entry.willAutoPost ? 'auto-posting' : 'manual'}
                  </span>
                </Text>
                <Text style={assetTypeText}>
                  Asset: {entry.assetType}
                  {entry.willAutoPost && entry.scheduledTimeUtc
                    ? ` · scheduled ${entry.scheduledTimeUtc} UTC`
                    : ''}
                </Text>
                <Text style={captionBlock}>{entry.caption}</Text>
              </Section>
            ))}
          </>
        )}

        {/* ── Section 3: Content Reel — today's stat / fact / tip / myth ── */}
        {contentReel && (
          <>
            <Hr style={hr} />
            <Section style={infoSection}>
              <Heading as="h2" style={sectionTitle}>
                {contentReel.kind === 'MYTH'
                  ? "🧐 Today's Myth-Bust"
                  : contentReel.kind === 'TIP'
                    ? "💡 Today's Tip"
                    : contentReel.kind === 'FACT'
                      ? "🧠 Today's Fact"
                      : "📊 Today's Stat"}
              </Heading>
              <Text style={paragraph}>
                <strong>{contentReel.hook}</strong>
              </Text>
              {contentReel.sourceTitle && (
                <Text style={paragraph}>
                  Source:{' '}
                  {contentReel.sourceUrl ? (
                    <Link href={contentReel.sourceUrl} style={inlineLink}>
                      {contentReel.sourceTitle}
                    </Link>
                  ) : (
                    contentReel.sourceTitle
                  )}
                </Text>
              )}
              <Section style={assetSection}>
                {contentReel.reelUrl && (
                  <Text style={paragraph}>
                    🎬 Video (mp4):{' '}
                    <Link href={contentReel.reelUrl} style={inlineLink}>
                      Download Reel (1080×1920)
                    </Link>
                  </Text>
                )}
                {contentReel.coverUrl && (
                  <Text style={paragraph}>
                    📸 Cover (jpg):{' '}
                    <Link href={contentReel.coverUrl} style={inlineLink}>
                      Download Cover Image
                    </Link>
                  </Text>
                )}
              </Section>
            </Section>

            {/* Per-platform breakdown — caption + scheduled UTC fire time
                + manual flag. TikTok always renders here as manual since
                we don't auto-post TikTok content reels (you upload via
                the app yourself). IG/FB/Pinterest auto-fire at the times
                listed. */}
            {contentReel.entries?.map((entry, index) => (
              <Section key={`content-reel-${index}`} style={platformCard}>
                <Text style={platformHeader}>
                  <span style={platformName}>{entry.platform}</span>
                  <span style={entry.willAutoPost ? badgeAuto : badgeManual}>
                    {entry.willAutoPost ? 'auto-posting' : 'manual'}
                  </span>
                </Text>
                <Text style={assetTypeText}>
                  Asset: {entry.assetType}
                  {entry.willAutoPost && entry.scheduledTimeUtc
                    ? ` · scheduled ${entry.scheduledTimeUtc} UTC`
                    : ''}
                </Text>
                <Text style={captionBlock}>{entry.caption}</Text>
              </Section>
            ))}
          </>
        )}

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>Chunky Crayon - Daily Posting Brief</Text>
          <Text style={footerCopyright}>
            &copy; {new Date().getFullYear()} Chunky Crayon. Internal
            notification.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#FAF7F2',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  padding: '20px 0',
};

const logoLink = {
  textDecoration: 'none',
};

const logo = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#DA7353',
  margin: '0',
};

const hero = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #F0E6D8',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#333333',
  margin: '0 0 8px',
};

const heroSubtitle = {
  fontSize: '16px',
  color: '#666666',
  margin: '0',
};

const heroNote = {
  fontSize: '13px',
  color: '#888888',
  margin: '12px 0 0',
  fontStyle: 'italic' as const,
};

const blogImage = {
  width: '100%',
  maxWidth: '552px',
  height: 'auto',
  borderRadius: '12px',
  margin: '12px 0',
  display: 'block',
};

const infoSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  margin: '0 0 16px',
  border: '2px solid #F0E6D8',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#DA7353',
  margin: '0 0 12px',
};

const paragraph = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#333333',
  margin: '0 0 8px',
};

const inlineLink = {
  color: '#DA7353',
  textDecoration: 'underline',
};

const assetSection = {
  backgroundColor: '#FFF5EE',
  border: '2px solid #EDAF8B',
  borderRadius: '16px',
  padding: '24px',
  margin: '0 0 16px',
};

const assetTitle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#DA7353',
  margin: '0 0 12px',
};

const platformCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '20px',
  margin: '0 0 12px',
  border: '2px solid #F0E6D8',
};

const platformHeader = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333333',
  margin: '0 0 8px',
};

const platformName = {
  marginRight: '12px',
};

const badgeAuto = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#FFFFFF',
  backgroundColor: '#4CAF50',
  padding: '2px 8px',
  borderRadius: '10px',
};

const badgeManual = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#FFFFFF',
  backgroundColor: '#EDAF8B',
  padding: '2px 8px',
  borderRadius: '10px',
};

const assetTypeText = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 0 12px',
};

const captionBlock = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#333333',
  backgroundColor: '#FAF7F2',
  padding: '12px',
  borderRadius: '8px',
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  whiteSpace: 'pre-wrap' as const,
  margin: '0',
};

const hr = {
  borderColor: '#F0E6D8',
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 24px',
};

const footerText = {
  fontSize: '14px',
  color: '#DA7353',
  fontWeight: '600',
  margin: '0 0 8px',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#CCCCCC',
  margin: '0',
};

export default SocialDigestEmail;
