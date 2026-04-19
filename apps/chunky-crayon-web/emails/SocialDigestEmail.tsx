import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type SocialDigestEntry = {
  platform: string;
  caption: string;
  autoPosted: boolean;
  assetType: 'image' | 'video';
  assetUrl?: string;
};

type SocialDigestEmailProps = {
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
  timestamp: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const SocialDigestEmail = ({
  coloringImageTitle = "Today's Coloring Page",
  coloringImageUrl = 'https://chunkycrayon.com',
  dailyImageAssetUrl,
  dailyEntries = [],
  demoReelTitle,
  demoReelUrl,
  demoReelCoverUrl,
  demoReelEntries = [],
  timestamp = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
}: SocialDigestEmailProps) => (
  <Html>
    <Head />
    <Preview>Social Media Digest - {coloringImageTitle}</Preview>
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
          <Heading style={heroTitle}>Social Media Digest</Heading>
          <Text style={heroSubtitle}>{timestamp}</Text>
        </Section>

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
              <span style={entry.autoPosted ? badgeAuto : badgeManual}>
                {entry.autoPosted ? 'auto-posted' : 'manual'}
              </span>
            </Text>
            <Text style={assetTypeText}>Asset: {entry.assetType}</Text>
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
                  <span style={entry.autoPosted ? badgeAuto : badgeManual}>
                    {entry.autoPosted ? 'auto-posted' : 'manual'}
                  </span>
                </Text>
                <Text style={assetTypeText}>Asset: {entry.assetType}</Text>
                <Text style={captionBlock}>{entry.caption}</Text>
              </Section>
            ))}
          </>
        )}

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>Chunky Crayon - Social Media Digest</Text>
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
