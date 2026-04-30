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

type TrialEndingEmailProps = {
  userName?: string;
  planName: string;
  /** Localized date string for when the first charge will land. */
  chargeDate: string;
  /** Localized price string e.g. "£13.99". */
  amount: string;
  billingPortalUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

// Sent ~24h before the 7-day trial ends. Stripe fires the
// `customer.subscription.trial_will_end` webhook 3 days before by
// default — we adjust to 1 day in the webhook handler so the reminder
// arrives close enough to be useful but not so early it gets ignored.
const TrialEndingEmail = ({
  userName,
  planName,
  chargeDate,
  amount,
  billingPortalUrl,
}: TrialEndingEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your Chunky Crayon trial ends tomorrow — {amount} on {chargeDate}.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Link href={baseUrl} style={logoLink}>
            <Text style={logo}>Chunky Crayon</Text>
          </Link>
        </Section>

        {/* Heads-up banner */}
        <Section style={banner}>
          <Text style={bannerEmoji}>🖍️</Text>
          <Heading style={bannerTitle}>Your trial ends tomorrow</Heading>
        </Section>

        {/* Main content */}
        <Section style={content}>
          <Text style={greeting}>Hi{userName ? ` ${userName}` : ''},</Text>
          <Text style={paragraph}>
            Quick heads-up — your free trial of <strong>{planName}</strong> ends
            tomorrow. We&apos;ll charge <strong>{amount}</strong> on{' '}
            <strong>{chargeDate}</strong> to keep your subscription active.
          </Text>
          <Text style={paragraph}>
            No action needed if you&apos;re happy. Cancel any time before then
            and you won&apos;t be charged.
          </Text>
        </Section>

        {/* What happens next */}
        <Section style={infoSection}>
          <Heading as="h2" style={infoTitle}>
            What happens next
          </Heading>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Tomorrow: we charge {amount} and your
            subscription continues
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Your credits roll over per the{' '}
            {planName} plan rules
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Cancel any time, one click
          </Text>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Link href={billingPortalUrl} style={ctaButton}>
            Manage subscription
          </Link>
          <Text style={ctaSubtext}>
            Update your card, switch plans, or cancel from one screen.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Hope they&apos;ve been making pages they love. Reply to this email
            if anything&apos;s not right.
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

// Styles — match warm palette from PaymentFailedEmail / WelcomeEmail
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

const logoLink = { textDecoration: 'none' };

const logo = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#DA7353',
  margin: '0',
};

const banner = {
  backgroundColor: '#FFF3E0',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #FFE0B2',
};

const bannerEmoji = { fontSize: '48px', margin: '0 0 16px' };

const bannerTitle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#DA7353',
  margin: '0',
};

const content = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  marginBottom: '16px',
  border: '1px solid #F5F0E8',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#3F3127',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#5C4D43',
  margin: '0 0 16px',
};

const infoSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  marginBottom: '16px',
  border: '1px solid #F5F0E8',
};

const infoTitle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#3F3127',
  margin: '0 0 16px',
};

const infoItem = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#5C4D43',
  margin: '0 0 8px',
};

const bullet = {
  color: '#DA7353',
  fontWeight: '700',
  marginRight: '8px',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px 0',
};

const ctaButton = {
  backgroundColor: '#DA7353',
  borderRadius: '999px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
};

const ctaSubtext = {
  fontSize: '14px',
  color: '#8C7A6B',
  margin: '12px 0 0',
};

const hr = {
  borderColor: '#F5F0E8',
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 16px',
};

const footerText = {
  fontSize: '14px',
  color: '#8C7A6B',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const footerLinks = {
  fontSize: '12px',
  color: '#8C7A6B',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#DA7353',
  textDecoration: 'none',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#B5A89B',
  margin: '0',
};

export default TrialEndingEmail;
