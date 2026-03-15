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

type PaymentFailedEmailProps = {
  userName?: string;
  planName: string;
  attemptCount: number;
  billingPortalUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const PaymentFailedEmail = ({
  userName,
  planName,
  attemptCount,
  billingPortalUrl,
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Action needed: Your Chunky Crayon payment couldn't be processed
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Link href={baseUrl} style={logoLink}>
            <Text style={logo}>Chunky Crayon</Text>
          </Link>
        </Section>

        {/* Alert Icon */}
        <Section style={alertSection}>
          <Text style={alertEmoji}>⚠️</Text>
          <Heading style={alertTitle}>Payment Issue</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Text style={greeting}>Hi{userName ? ` ${userName}` : ''},</Text>
          <Text style={paragraph}>
            We tried to process your payment for your{' '}
            <strong>{planName}</strong> subscription, but it didn&apos;t go
            through.
          </Text>
          {attemptCount > 1 && (
            <Text style={paragraph}>
              This is attempt #{attemptCount}. Please update your payment method
              to keep your subscription active.
            </Text>
          )}
        </Section>

        {/* What Happens Next */}
        <Section style={infoSection}>
          <Heading as="h2" style={infoTitle}>
            What happens next?
          </Heading>
          <Text style={infoItem}>
            <span style={bullet}>•</span> We&apos;ll retry your payment in a few
            days
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Your credits will continue to work for
            now
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Update your payment method to avoid
            interruption
          </Text>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Link href={billingPortalUrl} style={ctaButton}>
            Update Payment Method
          </Link>
          <Text style={ctaSubtext}>
            You can also manage your subscription from your account settings
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Need help? Reply to this email and we&apos;ll sort it out together.
          </Text>
          <Text style={footerLinks}>
            <Link href={`${baseUrl}/privacy`} style={footerLink}>
              Privacy Policy
            </Link>
            {' | '}
            <Link href={`${baseUrl}/terms`} style={footerLink}>
              Terms of Service
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

// Styles - matching the warm palette from other emails
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

const alertSection = {
  backgroundColor: '#FFF3E0',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #FFE0B2',
};

const alertEmoji = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const alertTitle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#E65100',
  margin: '0',
};

const content = {
  padding: '0 24px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#333333',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333333',
  margin: '0 0 16px',
};

const infoSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px 0',
  border: '2px solid #F0E6D8',
};

const infoTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#DA7353',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const infoItem = {
  fontSize: '14px',
  color: '#333333',
  margin: '0 0 12px',
  paddingLeft: '8px',
};

const bullet = {
  marginRight: '8px',
  color: '#DA7353',
  fontWeight: '600',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px 0',
};

const ctaButton = {
  backgroundColor: '#DA7353',
  color: '#FFFFFF',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '16px',
  display: 'inline-block',
};

const ctaSubtext = {
  fontSize: '14px',
  color: '#666666',
  margin: '16px 0 0',
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
  color: '#666666',
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

export default PaymentFailedEmail;
