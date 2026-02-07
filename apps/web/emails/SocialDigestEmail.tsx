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

export type SocialDigestEntry = {
  platform: string;
  caption: string;
  autoPosted: boolean;
  assetType: 'image' | 'video';
  assetUrl?: string;
};

type SocialDigestEmailProps = {
  coloringImageTitle: string;
  coloringImageUrl: string;
  svgUrl?: string;
  animationUrl?: string;
  entries: SocialDigestEntry[];
  timestamp: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const SocialDigestEmail = ({
  coloringImageTitle = "Today's Coloring Page",
  coloringImageUrl = 'https://chunkycrayon.com',
  svgUrl,
  animationUrl,
  entries = [],
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

        {/* Coloring Page Info */}
        <Section style={infoSection}>
          <Heading as="h2" style={sectionTitle}>
            Coloring Page
          </Heading>
          <Text style={paragraph}>
            <strong>{coloringImageTitle}</strong>
          </Text>
          <Text style={paragraph}>
            <Link href={coloringImageUrl} style={inlineLink}>
              View on site
            </Link>
          </Text>
        </Section>

        {/* Asset Downloads */}
        {(svgUrl || animationUrl) && (
          <Section style={infoSection}>
            <Heading as="h2" style={sectionTitle}>
              Assets
            </Heading>
            {svgUrl && (
              <Text style={paragraph}>
                SVG:{' '}
                <Link href={svgUrl} style={inlineLink}>
                  Download
                </Link>
              </Text>
            )}
            {animationUrl && (
              <Text style={paragraph}>
                Animation:{' '}
                <Link href={animationUrl} style={inlineLink}>
                  Download
                </Link>
              </Text>
            )}
          </Section>
        )}

        {/* Platform Entries */}
        {entries.map((entry, index) => (
          <Section key={index} style={platformCard}>
            <Text style={platformHeader}>
              <span style={platformName}>{entry.platform}</span>
              <span style={entry.autoPosted ? badgeAuto : badgeManual}>
                {entry.autoPosted ? 'auto-posted' : 'manual'}
              </span>
            </Text>
            <Text style={assetTypeText}>
              Asset: {entry.assetType}
              {entry.assetUrl && (
                <>
                  {' '}
                  <Link href={entry.assetUrl} style={inlineLink}>
                    (view)
                  </Link>
                </>
              )}
            </Text>
            <Text style={captionBlock}>{entry.caption}</Text>
          </Section>
        ))}

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
