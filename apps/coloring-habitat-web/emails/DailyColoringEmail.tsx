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
} from "@react-email/components";

type DailyColoringEmailProps = {
  imageUrl?: string;
  imageTitle?: string;
  imageId?: string;
  difficulty?: string;
};

export const DailyColoringEmail = ({
  imageUrl = "https://coloringhabitat.com/placeholder.jpg",
  imageTitle = "Today's coloring page",
  imageId = "",
  difficulty = "Intermediate",
}: DailyColoringEmailProps) => {
  const colorUrl = `https://coloringhabitat.com/coloring-image/${imageId}`;

  return (
    <Html>
      <Head />
      <Preview>Your daily moment of calm — {imageTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Coloring Habitat</Text>
          </Section>

          <Text style={greeting}>Good morning</Text>

          <Heading style={heading}>{imageTitle}</Heading>

          <Text style={paragraph}>
            Here&apos;s today&apos;s coloring page — take a few minutes to
            unwind and let your creativity flow.
          </Text>

          <Section style={imageSection}>
            <Img src={imageUrl} alt={imageTitle} width="480" style={image} />
            <Text style={difficultyBadge}>{difficulty}</Text>
          </Section>

          <Section style={ctaSection}>
            <Link href={colorUrl} style={ctaButton}>
              Color this page
            </Link>
          </Section>

          <Text style={tipText}>
            Tip: Try coloring for just 5 minutes. Research shows even short
            creative sessions reduce stress and improve focus.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            You&apos;re receiving this because you subscribed to daily coloring
            pages.
            <br />
            <Link
              href="https://coloringhabitat.com/unsubscribe"
              style={footerLink}
            >
              Unsubscribe
            </Link>
            {" · "}
            <Link href="https://coloringhabitat.com" style={footerLink}>
              coloringhabitat.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyColoringEmail;

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
  marginBottom: "24px",
};

const logoText = {
  fontSize: "20px",
  fontWeight: "800" as const,
  color: "#E63956",
  letterSpacing: "-0.02em",
};

const greeting = {
  fontSize: "14px",
  color: "#717171",
  margin: "0 0 4px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "800" as const,
  color: "#222222",
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#484848",
  margin: "0 0 24px",
};

const imageSection = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const image = {
  borderRadius: "12px",
  maxWidth: "100%",
};

const difficultyBadge = {
  display: "inline-block",
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#008489",
  backgroundColor: "rgba(0, 132, 137, 0.1)",
  padding: "4px 12px",
  borderRadius: "100px",
  marginTop: "8px",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "24px 0",
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

const tipText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#717171",
  fontStyle: "italic" as const,
  backgroundColor: "#F7F7F7",
  padding: "16px 20px",
  borderRadius: "8px",
  margin: "0 0 24px",
};

const hr = {
  borderColor: "#EBEBEB",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#717171",
  lineHeight: "1.5",
  textAlign: "center" as const,
};

const footerLink = {
  color: "#717171",
  textDecoration: "underline",
};
