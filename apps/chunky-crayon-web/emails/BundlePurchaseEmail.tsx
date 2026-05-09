import {
  Body,
  Button,
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

type BundlePurchaseEmailProps = {
  /** First name of the buyer, if we have one. Falls back to a generic
   *  greeting when missing — guest checkout often is. */
  buyerName?: string;
  bundleName: string;
  bundleTagline: string;
  pageCount: number;
  /** Price formatted for display, e.g. "£4.99". */
  priceDisplay: string;
  /** Square listing JPG URL (R2). Used as a hero image. */
  coverImageUrl: string;
  /** Signed download URL for /api/bundles/[slug]/download?token=. */
  downloadUrl: string;
  /** Bundle product page URL — for the secondary "view your bundle" link. */
  productPageUrl: string;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

const BundlePurchaseEmail = ({
  buyerName,
  bundleName,
  bundleTagline,
  pageCount,
  priceDisplay,
  coverImageUrl,
  downloadUrl,
  productPageUrl,
}: BundlePurchaseEmailProps) => (
  <Html>
    <Head />
    <Preview>{`Your ${bundleName} bundle is ready to download`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Link href={baseUrl} style={logoLink}>
            <Text style={logo}>Chunky Crayon</Text>
          </Link>
        </Section>

        <Section style={hero}>
          <Img
            src={coverImageUrl}
            alt={bundleName}
            width="520"
            style={coverImg}
          />
        </Section>

        <Section style={content}>
          <Heading style={heroTitle}>
            {buyerName ? `Thanks, ${buyerName}!` : 'Thanks for your order!'}
          </Heading>
          <Text style={paragraph}>
            Your <strong>{bundleName}</strong> bundle is ready. {pageCount}{' '}
            printable coloring pages, plus you can color every one online too.
          </Text>
          <Text style={tagline}>{bundleTagline}</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={ctaButton} href={downloadUrl}>
            Download your bundle
          </Button>
          <Text style={ctaSub}>
            The link works for 14 days. Save the PDF somewhere safe.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={content}>
          <Heading as="h2" style={whatNextTitle}>
            What you can do with your bundle
          </Heading>
          <Text style={listItem}>
            <span style={checkmark}>✓</span> Print every page as many times as
            you like
          </Text>
          <Text style={listItem}>
            <span style={checkmark}>✓</span> Open any page in our online
            coloring canvas, no app needed
          </Text>
          <Text style={listItem}>
            <span style={checkmark}>✓</span> Meet the same recurring characters
            across all {pageCount} pages
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={footer}>
          <Text style={footerText}>
            Order total: <strong>{priceDisplay}</strong>
          </Text>
          <Text style={footerText}>
            Need to re-download? Visit{' '}
            <Link href={productPageUrl} style={footerLink}>
              your bundle page
            </Link>
            .
          </Text>
          <Text style={footerSmall}>Chunky Crayon · chunkycrayon.com</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#FFFAF5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '24px 16px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '16px',
};

const logoLink = { textDecoration: 'none' };

const logo = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#7A4FBF',
  margin: 0,
};

const hero = {
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const coverImg = {
  width: '100%',
  maxWidth: '520px',
  borderRadius: '16px',
  border: '2px solid rgba(92, 58, 33, 0.1)',
};

const content = {
  padding: '0 8px',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#3A2616',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: 1.6,
  color: '#5C3A21',
  textAlign: 'center' as const,
};

const tagline = {
  fontSize: '15px',
  fontStyle: 'italic',
  color: '#9B7755',
  textAlign: 'center' as const,
  marginTop: '4px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const ctaButton = {
  backgroundColor: '#F86A2F',
  color: '#FFFFFF',
  padding: '16px 32px',
  borderRadius: '999px',
  fontSize: '16px',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
};

const ctaSub = {
  fontSize: '13px',
  color: '#9B7755',
  marginTop: '12px',
};

const hr = {
  borderColor: 'rgba(92, 58, 33, 0.1)',
  margin: '24px 0',
};

const whatNextTitle = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#3A2616',
  margin: '0 0 12px',
};

const listItem = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#5C3A21',
  margin: '6px 0',
};

const checkmark = {
  color: '#F86A2F',
  fontWeight: 700,
  marginRight: '8px',
};

const footer = {
  padding: '0 8px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#5C3A21',
  margin: '4px 0',
};

const footerLink = {
  color: '#7A4FBF',
  textDecoration: 'underline',
};

const footerSmall = {
  fontSize: '12px',
  color: '#9B7755',
  marginTop: '12px',
};

export default BundlePurchaseEmail;
