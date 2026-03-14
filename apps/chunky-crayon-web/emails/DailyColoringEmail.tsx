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

type DailyColoringEmailProps = {
  previewText?: string;
  unsubscribeUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const DailyColoringEmail = ({
  previewText = 'Your daily coloring page is here!',
  unsubscribeUrl,
}: DailyColoringEmailProps) => {
  const date = new Date();
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
            <Heading style={heroTitle}>Happy {dayName}!</Heading>
            <Text style={heroSubtitle}>{formattedDate}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={paragraph}>
              Your daily coloring page is attached to this email as a PDF.
            </Text>
            <Text style={paragraph}>
              Print it out and let your creativity shine!
            </Text>
          </Section>

          {/* Tips Section */}
          <Section style={tipsSection}>
            <Heading as="h2" style={tipsTitle}>
              Coloring Tips
            </Heading>
            <Text style={tipItem}>
              <span style={tipEmoji}>1.</span> Use crayons, colored pencils, or
              markers
            </Text>
            <Text style={tipItem}>
              <span style={tipEmoji}>2.</span> Try mixing different colors
            </Text>
            <Text style={tipItem}>
              <span style={tipEmoji}>3.</span> Have fun - there are no wrong
              colors!
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaText}>Want more coloring pages?</Text>
            <Link href={baseUrl} style={ctaButton}>
              Visit Chunky Crayon
            </Link>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>Made with love in South London</Text>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}/privacy`} style={footerLink}>
                Privacy Policy
              </Link>
              {' | '}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerCopyright}>
              &copy; {new Date().getFullYear()} Chunky Crayon. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles - using warm analogous palette (coral, peach, cream)
const main = {
  backgroundColor: '#FAF7F2', // paper-cream
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
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
  color: '#DA7353', // crayon-orange (coral)
  margin: '0',
};

const hero = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #F0E6D8', // warm border
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

const content = {
  padding: '0 24px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333333',
  margin: '0 0 16px',
};

const tipsSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px 0',
  border: '2px solid #F0E6D8', // warm border
};

const tipsTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#DA7353', // crayon-orange (coral)
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const tipItem = {
  fontSize: '14px',
  color: '#333333',
  margin: '0 0 8px',
  paddingLeft: '8px',
};

const tipEmoji = {
  marginRight: '8px',
  fontWeight: '600',
  color: '#EDAF8B', // crayon-teal (peach)
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px 0',
};

const ctaText = {
  fontSize: '16px',
  color: '#666666',
  margin: '0 0 16px',
};

const ctaButton = {
  backgroundColor: '#DA7353', // crayon-orange (coral)
  color: '#FFFFFF',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '16px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#F0E6D8', // warm border
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 24px',
};

const footerText = {
  fontSize: '14px',
  color: '#DA7353', // crayon-orange (coral)
  fontWeight: '600',
  margin: '0 0 12px',
};

const footerLinks = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#999999',
  textDecoration: 'underline',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#CCCCCC',
  margin: '0',
};

export default DailyColoringEmail;
