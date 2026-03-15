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
} from "@react-email/components";

type WelcomeEmailProps = {
  name?: string;
};

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to Coloring Habitat — your creative calm starts here
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Coloring Habitat</Text>
          </Section>

          <Heading style={heading}>Welcome, {firstName}</Heading>

          <Text style={paragraph}>
            We&apos;re so glad you&apos;re here. Coloring Habitat is your space
            for creative relaxation — a place to slow down, focus, and find calm
            through coloring.
          </Text>

          <Text style={paragraph}>Here&apos;s how to get started:</Text>

          <Section style={stepsSection}>
            <Text style={step}>
              <strong>1. Browse the gallery</strong> — explore our collection of
              intricate designs, from mandalas to botanical illustrations.
            </Text>
            <Text style={step}>
              <strong>2. Create your own</strong> — describe what you&apos;d
              like to color and we&apos;ll generate a unique page just for you.
            </Text>
            <Text style={step}>
              <strong>3. Color online or print</strong> — use our digital canvas
              or download high-res PDFs for your favourite pencils and pens.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Link href="https://coloringhabitat.com/gallery" style={ctaButton}>
              Start coloring
            </Link>
          </Section>

          <Text style={paragraph}>
            You get 2 free creations every day. If you&apos;d like unlimited
            access, check out our{" "}
            <Link href="https://coloringhabitat.com/pricing" style={link}>
              plans
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Coloring Habitat — Mindful coloring for everyone.
            <br />
            <Link href="https://coloringhabitat.com" style={footerLink}>
              coloringhabitat.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: "#FFFFFF",
  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoText = {
  fontSize: "24px",
  fontWeight: "800" as const,
  color: "#E63956",
  letterSpacing: "-0.02em",
};

const heading = {
  fontSize: "28px",
  fontWeight: "800" as const,
  color: "#222222",
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#484848",
  margin: "0 0 16px",
};

const stepsSection = {
  margin: "24px 0",
  padding: "20px 24px",
  backgroundColor: "#F7F7F7",
  borderRadius: "12px",
};

const step = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#484848",
  margin: "0 0 12px",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const ctaButton = {
  backgroundColor: "#E63956",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "700" as const,
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: "8px",
  display: "inline-block",
};

const link = {
  color: "#008489",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#EBEBEB",
  margin: "32px 0",
};

const footer = {
  fontSize: "13px",
  color: "#717171",
  lineHeight: "1.5",
  textAlign: "center" as const,
};

const footerLink = {
  color: "#717171",
  textDecoration: "underline",
};
