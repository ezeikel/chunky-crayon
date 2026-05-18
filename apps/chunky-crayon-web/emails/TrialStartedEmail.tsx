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

type TrialStartedEmailProps = {
  userName?: string;
  planName: string;
  /** Credits granted by the plan, e.g. 1000. */
  credits: number;
  /** True when the subscription is on the 7-day free trial. */
  isTrialing: boolean;
  /** Localized date string for when the first charge will land. Trial only. */
  chargeDate?: string;
  /** Localized price string e.g. "£249.99". Trial only. */
  amount?: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const utm = (campaign: string) =>
  `?utm_source=trial-started-email&utm_medium=email&utm_campaign=${campaign}`;

// Sent once, immediately after a Stripe subscription is created via
// checkout.session.completed. Its whole job is activation: get the new
// subscriber to make their first coloring page before the trial ends.
// Trial-aware: when on the 7-day trial it states the real charge date
// and amount so the follow-up TrialEndingEmail can't feel like a
// bait-and-switch. No prop defaults on purpose. The webhook always
// passes real values; defaulting would silently send placeholder
// content to a real user if a field were ever missing. Preview-only
// sample data lives in PreviewProps below instead.
const TrialStartedEmail = ({
  userName,
  planName,
  credits,
  isTrialing,
  chargeDate,
  amount,
}: TrialStartedEmailProps) => (
  <Html>
    <Head />
    <Preview>{`You have ${credits} credits ready. Let's make your first coloring page.`}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Link href={baseUrl} style={logoLink}>
            <Img
              src="https://www.chunkycrayon.com/logos/cc-logo.png"
              width="44"
              height="48"
              alt="Chunky Crayon"
              style={logo}
            />
          </Link>
        </Section>

        {/* Welcome banner */}
        <Section style={banner}>
          <Text style={bannerEmoji}>🎨</Text>
          <Heading style={bannerTitle}>
            {userName ? `You're all set, ${userName}!` : "You're all set!"}
          </Heading>
        </Section>

        {/* Main content */}
        <Section style={content}>
          <Text style={greeting}>{userName ? `Hi ${userName},` : 'Hi,'}</Text>
          <Text style={paragraph}>
            Welcome to <strong>{planName}</strong>! Your{' '}
            <strong>{credits} credits</strong> are ready to go, so let&apos;s
            turn an idea into a coloring page your kids will love.
          </Text>
          {isTrialing && chargeDate && amount ? (
            <Text style={paragraph}>
              You&apos;re on a free 7-day trial. We won&apos;t charge{' '}
              <strong>{amount}</strong> until <strong>{chargeDate}</strong>, and
              you can cancel anytime before then with one click.
            </Text>
          ) : null}
        </Section>

        {/* How it works */}
        <Section style={infoSection}>
          <Heading as="h2" style={infoTitle}>
            Make your first page in under a minute
          </Heading>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Tell us what you want: &quot;a
            friendly dragon baking cookies&quot;
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> We turn it into a clean, printable
            coloring page
          </Text>
          <Text style={infoItem}>
            <span style={bullet}>•</span> Color it on screen, or print it for
            screen-free time
          </Text>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Link
            href={`${baseUrl}/start${utm('first-page-cta')}`}
            style={ctaButton}
          >
            Make your first page
          </Link>
          <Text style={ctaSubtext}>
            Stuck for ideas? Try &quot;dinosaurs having a tea party.&quot;
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Reply to this email anytime, a real person reads it. Happy coloring!
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

// Preview-server data only (react-email reads Component.PreviewProps).
// Mirrors a real Sparkle annual trial so the preview shows what Lisa
// actually receives. Not bundled into production sends.
TrialStartedEmail.PreviewProps = {
  userName: 'Lisa',
  planName: 'Sparkle Plan',
  credits: 1000,
  isTrialing: true,
  chargeDate: '25 May 2026',
  amount: '£249.99',
} satisfies TrialStartedEmailProps;

// Styles: match warm palette from TrialEndingEmail / PaymentFailedEmail
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
  display: 'block',
  margin: '0 auto',
  border: '0',
  outline: 'none',
  textDecoration: 'none',
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

export default TrialStartedEmail;
