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

type DailyColoringEmailProps = {
  previewText?: string;
  unsubscribeUrl: string;
};

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://coloringhabitat.com";

const DailyColoringEmail = ({
  previewText = "Your daily moment of calm is here",
  unsubscribeUrl,
}: DailyColoringEmailProps) => {
  const date = new Date();
  const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
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
              <Text style={logo}>Coloring Habitat</Text>
            </Link>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Heading style={heroTitle}>Good morning</Heading>
            <Text style={heroSubtitle}>
              {dayName}, {formattedDate}
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={paragraph}>
              Your coloring page for today is attached as a PDF.
            </Text>
            <Text style={paragraph}>
              Take a few quiet minutes — pour a cup of tea, find your favourite
              pencils, and let your hands do the thinking for a while.
            </Text>
          </Section>

          {/* Tips Section */}
          <Section style={tipsSection}>
            <Heading as="h2" style={tipsTitle}>
              A gentle reminder
            </Heading>
            <Text style={tipItem}>
              Coloring activates the same parts of the brain as meditation. Even
              five minutes can lower cortisol and quiet a busy mind.
            </Text>
            <Text style={tipItem}>
              There&apos;s no right way to do this. Stay inside the lines or
              don&apos;t. Use unexpected colors. Begin and abandon. It&apos;s
              all part of the practice.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaText}>Prefer to color on screen?</Text>
            <Link href={baseUrl} style={ctaButton}>
              Open Coloring Habitat
            </Link>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>Mindful coloring for everyone</Text>
            <Text style={footerLinks}>
              <Link href={`${baseUrl}/privacy`} style={footerLink}>
                Privacy Policy
              </Link>
              {" | "}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerCopyright}>
              &copy; {new Date().getFullYear()} Coloring Habitat. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles — calm wellness palette (cream, sage, soft pink primary)
const main = {
  backgroundColor: "#FFFFFF",
  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const header = {
  textAlign: "center" as const,
  padding: "20px 0",
};

const logoLink = {
  textDecoration: "none",
};

const logo = {
  fontSize: "24px",
  fontWeight: "800" as const,
  color: "#E63956", // primary
  margin: "0",
  letterSpacing: "-0.02em",
};

const hero = {
  backgroundColor: "#F7F7F7",
  borderRadius: "16px",
  padding: "32px",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const heroTitle = {
  fontSize: "28px",
  fontWeight: "800" as const,
  color: "#222222",
  margin: "0 0 8px",
};

const heroSubtitle = {
  fontSize: "16px",
  color: "#717171",
  margin: "0",
};

const content = {
  padding: "0 24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
  margin: "0 0 16px",
};

const tipsSection = {
  backgroundColor: "#F7F7F7",
  borderRadius: "16px",
  padding: "24px",
  margin: "24px 0",
};

const tipsTitle = {
  fontSize: "16px",
  fontWeight: "700" as const,
  color: "#E63956",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const tipItem = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#484848",
  margin: "0 0 12px",
};

const ctaSection = {
  textAlign: "center" as const,
  padding: "24px 0",
};

const ctaText = {
  fontSize: "15px",
  color: "#717171",
  margin: "0 0 16px",
};

const ctaButton = {
  backgroundColor: "#E63956",
  color: "#FFFFFF",
  padding: "14px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "700" as const,
  fontSize: "15px",
  display: "inline-block",
};

const hr = {
  borderColor: "#EBEBEB",
  margin: "32px 0",
};

const footer = {
  textAlign: "center" as const,
  padding: "0 24px",
};

const footerText = {
  fontSize: "13px",
  color: "#717171",
  margin: "0 0 12px",
};

const footerLinks = {
  fontSize: "12px",
  color: "#999999",
  margin: "0 0 8px",
};

const footerLink = {
  color: "#999999",
  textDecoration: "underline",
};

const footerCopyright = {
  fontSize: "12px",
  color: "#CCCCCC",
  margin: "0",
};

export default DailyColoringEmail;
