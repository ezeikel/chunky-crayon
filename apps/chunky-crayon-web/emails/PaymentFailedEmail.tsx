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

/**
 * Dunning stage, mapped from Stripe's retry schedule in the
 * `invoice.payment_failed` webhook:
 *  - `first`  — first failed attempt. Gentle, reassuring, "probably the bank".
 *  - `retry`  — a later retry is still failing. Nudge toward a different card.
 *  - `final`  — Stripe's last scheduled attempt. Clear stakes, still kind.
 */
export type PaymentFailedStage = 'first' | 'retry' | 'final';

type PaymentFailedEmailProps = {
  userName?: string;
  planName: string;
  billingPortalUrl: string;
  stage?: PaymentFailedStage;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

// Per-stage copy. Kept as a lookup (not inline conditionals) so the
// three messages read as one coherent sequence and are easy to tweak.
// House rules honoured: no em dashes, no "AI", US/UK-neutral spelling,
// no emoji.
const STAGE_COPY: Record<
  PaymentFailedStage,
  {
    preview: string;
    badge: string;
    heading: string;
    cta: string;
    body: (planName: string) => string[];
    closing: string;
  }
> = {
  first: {
    preview: "Your card didn't go through, but nothing's lost yet.",
    badge: 'Payment update',
    heading: 'A little hiccup with your payment',
    cta: 'Update my card',
    body: (planName) => [
      `We just tried to start your Chunky Crayon ${planName} plan, but your card did not go through. This happens more than you would think, and it is almost never anything you did wrong. Often the bank simply blocks the first charge to a new place.`,
      'The quickest fix is to pop in a different card. It takes about thirty seconds, and your little one’s coloring picks up right where it left off.',
      'No rush tonight. We will try again in a few days, and everything you have made so far is safe.',
    ],
    closing: 'Warmly,',
  },
  retry: {
    preview:
      "We tried again and it's still being declined. A different card usually does the trick.",
    badge: 'Still trying',
    heading: 'Still can’t get your card to work',
    cta: 'Try a different card',
    body: (planName) => [
      'We gave your card another try and it is still being turned away. When this keeps happening, it is usually the card’s bank declining the type of payment rather than anything to do with your account.',
      'The fix that works almost every time: add a different card. A second card, or a debit card instead of credit, and you are sorted.',
      `Your ${planName} plan is still active for now, so there is no interruption yet. Updating today keeps it that way.`,
    ],
    closing: 'Thanks for sticking with us,',
  },
  final: {
    preview:
      'One more attempt coming up. Add a working card to keep coloring without a break.',
    badge: 'Last try',
    heading: 'Last try before your plan pauses',
    cta: 'Keep my plan active',
    body: (planName) => [
      `This is our last attempt to renew your Chunky Crayon ${planName} plan. If this one does not go through, your plan will pause and the extra creations and features will go quiet for a while.`,
      'You can keep everything running with one quick step: add a card that works.',
      'If now is not the right time, that is completely okay. Your account and everything you have made will stay safe, and you are welcome back whenever you like.',
    ],
    closing: 'Always here when you need us,',
  },
};

const PaymentFailedEmail = ({
  userName,
  planName,
  billingPortalUrl,
  stage = 'first',
}: PaymentFailedEmailProps) => {
  const copy = STAGE_COPY[stage];

  return (
    <Html>
      <Head />
      <Preview>{copy.preview}</Preview>
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

          {/* Stage badge + heading */}
          <Section style={alertSection}>
            <Text style={alertBadge}>{copy.badge}</Text>
            <Heading style={alertTitle}>{copy.heading}</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi{userName ? ` ${userName}` : ''},</Text>
            {copy.body(planName).map((line) => (
              <Text key={line.slice(0, 32)} style={paragraph}>
                {line}
              </Text>
            ))}
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Link href={billingPortalUrl} style={ctaButton}>
              {copy.cta}
            </Link>
            <Text style={ctaSubtext}>
              You can also manage your plan from your account settings.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {copy.closing}
              <br />
              Colo and the Chunky Crayon team
            </Text>
            <Text style={footerText}>
              Need a hand? Just reply to this email and we will sort it out
              together.
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
};

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
  display: 'block',
  margin: '0 auto',
  border: '0',
  outline: 'none',
  textDecoration: 'none',
};

const alertSection = {
  backgroundColor: '#FFF3E0',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '24px',
  border: '2px solid #FFE0B2',
};

const alertBadge = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#E65100',
  backgroundColor: '#FFE0B2',
  borderRadius: '999px',
  padding: '6px 14px',
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
  color: '#3F3127',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#3F3127',
  margin: '0 0 16px',
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
  color: '#8C7A6B',
  margin: '16px 0 0',
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
  color: '#8C7A6B',
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

export default PaymentFailedEmail;
