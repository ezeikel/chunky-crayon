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

type WelcomeEmailProps = {
  unsubscribeUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const utm = (campaign: string) =>
  `?utm_source=welcome-email&utm_medium=email&utm_campaign=${campaign}`;

const WelcomeEmail = ({ unsubscribeUrl }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your first coloring page lands tomorrow — and 2 more you can grab now
    </Preview>
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

        {/* Hero */}
        <Section style={hero}>
          <Text style={welcomeEmoji}>🎨</Text>
          <Heading style={heroTitle}>You&apos;re in.</Heading>
          <Text style={heroSubtitle}>
            One free coloring page in your inbox every morning, starting
            tomorrow.
          </Text>
        </Section>

        {/* What happens next — concrete, not hype. */}
        <Section style={expectSection}>
          <Heading as="h2" style={expectTitle}>
            What happens next
          </Heading>
          <Text style={expectItem}>
            <span style={checkmark}>1.</span>{' '}
            <strong>Tomorrow at 8:30am UK time</strong>, your first page lands
            as a PDF. Print it, or color it on screen.
          </Text>
          <Text style={expectItem}>
            <span style={checkmark}>2.</span> A different page every day — we
            draw something new based on what kids are loving right now.
          </Text>
          <Text style={expectItem}>
            <span style={checkmark}>3.</span> One-click unsubscribe at the
            bottom of every email. No spam, ever.
          </Text>
        </Section>

        {/* Soft pitch — try the generator while you wait. This is the
            highest-engagement moment we'll have with a new subscriber.
            We've earned the right to one ask. */}
        <Section style={pitchCard}>
          <Text style={pitchEyebrow}>While you wait</Text>
          <Heading as="h3" style={pitchTitle}>
            Make a custom page now
          </Heading>
          <Text style={pitchBody}>
            Type any subject — &quot;a fox in a spacesuit&quot;, &quot;our dog
            but as a pirate&quot;, your kid&apos;s name as a giant balloon — and
            we&apos;ll draw it. Print-ready in 30 seconds.{' '}
            <strong>First 2 are free, no signup needed.</strong>
          </Text>
          <Link href={`${baseUrl}${utm('try-generator')}`} style={pitchButton}>
            Try the generator
          </Link>
        </Section>

        {/* Bundle pitch — secondary, gentle. "Here's what's also available
            if you fall in love with daily coloring." */}
        <Section style={bundleCard}>
          <Text style={bundleEyebrow}>If your kid gets hooked</Text>
          <Heading as="h3" style={bundleTitle}>
            Themed bundles, £4.99 a pop
          </Heading>
          <Text style={bundleBody}>
            10-page coloring books on themes like Dino Dance Party. One-time
            buy, no subscription, yours to print forever.
          </Text>
          <Link
            href={`${baseUrl}/products/digital${utm('welcome-bundles')}`}
            style={bundleButton}
          >
            See the bundles
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

// Styles
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
  display: 'block',
  margin: '0 auto',
  border: '0',
  outline: 'none',
  textDecoration: 'none',
};

const hero = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '40px 32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #F5F0E8',
};

const welcomeEmoji = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const heroTitle = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#3F3127',
  margin: '0 0 12px',
};

const heroSubtitle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#8C7A6B',
  margin: '0',
};

const expectSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px 0',
  border: '2px solid #F5F0E8',
};

const expectTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#DA7353',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const expectItem = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#3F3127',
  margin: '0 0 14px',
  paddingLeft: '8px',
};

const checkmark = {
  marginRight: '8px',
  color: '#FFE0B2',
  fontWeight: '600',
};

const pitchCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '28px 24px',
  margin: '24px 0',
  border: '2px solid #F5F0E8',
  textAlign: 'center' as const,
};

const pitchEyebrow = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#DA7353',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px',
};

const pitchTitle = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#3F3127',
  margin: '0 0 12px',
};

const pitchBody = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#5C4D43',
  margin: '0 0 16px',
};

const pitchButton = {
  backgroundColor: '#DA7353',
  color: '#FFFFFF',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
  display: 'inline-block',
};

const bundleCard = {
  backgroundColor: '#FAF7F2',
  borderRadius: '16px',
  padding: '24px',
  margin: '24px 0',
  border: '1px dashed #F5F0E8',
  textAlign: 'center' as const,
};

const bundleEyebrow = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#8C7A6B',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px',
};

const bundleTitle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#3F3127',
  margin: '0 0 8px',
};

const bundleBody = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#8C7A6B',
  margin: '0 0 16px',
};

const bundleButton = {
  backgroundColor: '#FFFFFF',
  color: '#DA7353',
  border: '2px solid #DA7353',
  padding: '12px 24px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#F5F0E8',
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
  margin: '0 0 12px',
};

const footerLinks = {
  fontSize: '12px',
  color: '#8C7A6B',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#DA7353',
  textDecoration: 'underline',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#B5A89B',
  margin: '0',
};

export default WelcomeEmail;
