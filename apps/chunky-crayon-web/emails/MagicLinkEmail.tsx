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

type MagicLinkEmailProps = {
  magicLink: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const MagicLinkEmail = ({ magicLink }: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Tap to sign in to Chunky Crayon</Preview>
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
          <Text style={crayonEmoji}>🖍️</Text>
          <Heading style={heroTitle}>One tap and you&apos;re in</Heading>
          <Text style={heroSubtitle}>
            We sent this so you don&apos;t have to remember a password.
          </Text>
        </Section>

        {/* CTA card */}
        <Section style={ctaCard}>
          <Link href={magicLink} style={ctaButton}>
            Sign in to Chunky Crayon
          </Link>
          <Text style={expiryText}>This link works for the next 24 hours.</Text>
        </Section>

        {/* Fallback link */}
        <Section style={fallbackCard}>
          <Text style={fallbackLabel}>Button not working?</Text>
          <Text style={fallbackBody}>
            Copy and paste this link into your browser:
          </Text>
          <Text style={fallbackLink}>{magicLink}</Text>
        </Section>

        {/* Reassurance */}
        <Section style={reassureSection}>
          <Text style={reassureText}>
            Didn&apos;t ask for this email? No worries, you can safely ignore
            it. Your account stays put.
          </Text>
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
            <Link href={`${baseUrl}/terms`} style={footerLink}>
              Terms
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

MagicLinkEmail.PreviewProps = {
  magicLink:
    'https://chunkycrayon.com/api/auth/callback/resend?token=abc123xyz',
} as MagicLinkEmailProps;

// Styles — matches WelcomeEmail palette (coral + cream)
const main = {
  backgroundColor: '#FAF7F2',
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
  color: '#DA7353',
  margin: '0',
};

const hero = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '40px 32px 32px',
  textAlign: 'center' as const,
  marginBottom: '20px',
  border: '2px solid #F0E6D8',
};

const crayonEmoji = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#333333',
  margin: '0 0 12px',
  lineHeight: '34px',
};

const heroSubtitle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666666',
  margin: '0',
};

const ctaCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px 24px',
  margin: '0 0 20px',
  border: '2px solid #F0E6D8',
  textAlign: 'center' as const,
};

const ctaButton = {
  backgroundColor: '#DA7353',
  color: '#FFFFFF',
  padding: '16px 32px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '700',
  fontSize: '16px',
  display: 'inline-block',
  margin: '0 0 16px',
};

const expiryText = {
  fontSize: '13px',
  color: '#999999',
  margin: '0',
};

const fallbackCard = {
  backgroundColor: '#FAF7F2',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 20px',
  border: '1px dashed #D9C7B0',
};

const fallbackLabel = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#DA7353',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const fallbackBody = {
  fontSize: '14px',
  color: '#666666',
  margin: '0 0 12px',
  lineHeight: '20px',
};

const fallbackLink = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#DA7353',
  margin: '0',
  wordBreak: 'break-all' as const,
  fontFamily:
    'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const reassureSection = {
  padding: '0 8px',
  margin: '0 0 16px',
};

const reassureText = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#999999',
  margin: '0',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#F0E6D8',
  margin: '24px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 24px',
};

const footerText = {
  fontSize: '14px',
  color: '#DA7353',
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

export default MagicLinkEmail;
