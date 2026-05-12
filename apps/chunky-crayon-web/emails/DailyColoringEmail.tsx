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
import type { DailyUpsell } from '@/lib/email-upsell';

type DailyColoringEmailProps = {
  previewText?: string;
  unsubscribeUrl: string;
  /**
   * Today's upsell variant (subscription, bundle, app download, share,
   * comic-strip). Resolved by `getDailyUpsell()` at send time. Optional
   * because preview tools may render without one — fall back to a
   * generic "visit Chunky Crayon" CTA when absent.
   */
  upsell?: DailyUpsell;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const DailyColoringEmail = ({
  previewText = 'Your daily coloring page is here!',
  unsubscribeUrl,
  upsell,
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
              Today&apos;s coloring page is attached to this email. Print and
              go.
            </Text>
          </Section>

          {/* Upsell — one clearly-demarcated "you might also like" card.
              Picks a different variant every day of the week. */}
          {upsell ? <UpsellCard upsell={upsell} /> : <GenericCta />}

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

const UpsellCard = ({ upsell }: { upsell: DailyUpsell }) => {
  // Bundle upsell has runtime-fetched fields. When the send loop hasn't
  // filled them in (e.g. no published bundle that day), gracefully
  // skip to the generic CTA so the email still ships.
  if (upsell.kind === 'bundle') {
    if (!upsell.bundleName || !upsell.ctaUrl) {
      return <GenericCta />;
    }
    return (
      <Section style={upsellCard}>
        <Text style={upsellEyebrow}>{upsell.headline}</Text>
        <Heading as="h3" style={upsellTitle}>
          {upsell.bundleName}
        </Heading>
        {upsell.bundleTagline ? (
          <Text style={upsellBody}>{upsell.bundleTagline}</Text>
        ) : null}
        {upsell.bundlePriceDisplay ? (
          <Text style={upsellPrice}>{upsell.bundlePriceDisplay}</Text>
        ) : null}
        <Link href={upsell.ctaUrl} style={upsellButton}>
          {upsell.ctaLabel}
        </Link>
      </Section>
    );
  }

  // All other variants are self-contained.
  return (
    <Section style={upsellCard}>
      <Text style={upsellEyebrow}>{upsell.headline}</Text>
      <Text style={upsellBody}>{upsell.body}</Text>
      <Link href={upsell.ctaUrl} style={upsellButton}>
        {upsell.ctaLabel}
      </Link>
    </Section>
  );
};

const GenericCta = () => (
  <Section style={upsellCard}>
    <Text style={upsellEyebrow}>Want a custom page?</Text>
    <Text style={upsellBody}>
      Type any subject and we&apos;ll generate a print-ready coloring page in 30
      seconds. First 2 free.
    </Text>
    <Link
      href={`${baseUrl}/?utm_source=daily-email&utm_medium=email&utm_campaign=generic-cta`}
      style={upsellButton}
    >
      Make your own
    </Link>
  </Section>
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

const upsellCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '28px 24px',
  margin: '24px 0',
  border: '2px solid #F0E6D8',
  textAlign: 'center' as const,
};

const upsellEyebrow = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#DA7353',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px',
};

const upsellTitle = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#333333',
  margin: '0 0 8px',
};

const upsellBody = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#555555',
  margin: '0 0 16px',
};

const upsellPrice = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#333333',
  margin: '0 0 16px',
};

const upsellButton = {
  backgroundColor: '#DA7353',
  color: '#FFFFFF',
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
  display: 'inline-block',
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
