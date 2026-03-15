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

type WelcomeEmailProps = {
  unsubscribeUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const WelcomeEmail = ({ unsubscribeUrl }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Chunky Crayon - Free daily coloring pages!</Preview>
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
          <Text style={welcomeEmoji}>🎨</Text>
          <Heading style={heroTitle}>Welcome to the Coloring Club!</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Text style={paragraph}>
            You&apos;re all set to receive a <strong>free coloring page</strong>{' '}
            in your inbox every day!
          </Text>
          <Text style={paragraph}>
            Each page is uniquely generated just for you - no two are ever the
            same.
          </Text>
        </Section>

        {/* What to Expect */}
        <Section style={expectSection}>
          <Heading as="h2" style={expectTitle}>
            What to Expect
          </Heading>
          <Text style={expectItem}>
            <span style={checkmark}>✓</span> Daily coloring page delivered to
            your inbox
          </Text>
          <Text style={expectItem}>
            <span style={checkmark}>✓</span> High-quality PDF ready to print
          </Text>
          <Text style={expectItem}>
            <span style={checkmark}>✓</span> Fun themes for kids of all ages
          </Text>
          <Text style={expectItem}>
            <span style={checkmark}>✓</span> Completely free, forever
          </Text>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Text style={ctaText}>Can&apos;t wait for tomorrow?</Text>
          <Link href={baseUrl} style={ctaButton}>
            Create Your Own Now
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
  padding: '40px 32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #F0E6D8', // warm border
};

const welcomeEmoji = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#333333',
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

const expectSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px 0',
  border: '2px solid #F0E6D8', // warm border
};

const expectTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#DA7353', // crayon-orange (coral)
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const expectItem = {
  fontSize: '14px',
  color: '#333333',
  margin: '0 0 12px',
  paddingLeft: '8px',
};

const checkmark = {
  marginRight: '8px',
  color: '#EDAF8B', // crayon-teal (peach)
  fontWeight: '600',
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

export default WelcomeEmail;
