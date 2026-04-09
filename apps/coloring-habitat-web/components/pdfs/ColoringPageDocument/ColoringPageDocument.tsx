import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
  Font,
} from "@react-pdf/renderer";
import SvgToReactPdf from "@/components/SvgToReactPdf/SvgToReactPdf";

Font.register({
  family: "Plus Jakarta Sans",
  fonts: [
    {
      src: "/fonts/plus-jakarta-sans-regular.ttf",
      fontWeight: 400,
    },
    {
      src: "/fonts/plus-jakarta-sans-semibold.ttf",
      fontWeight: 600,
    },
    {
      src: "/fonts/plus-jakarta-sans-bold.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  main: {
    flexGrow: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  coloringImage: {
    width: "100%",
    height: "auto",
  },
  coloredImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  qrCodeImage: {
    width: "120px",
    height: "120px",
  },
  cta: {
    display: "flex",
    flexDirection: "column",
    justifyItems: "space-between",
    gap: 4,
    maxWidth: "50%",
  },
  ctaText: {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: 600,
    fontSize: 18,
  },
  ctaLink: {
    fontFamily: "Plus Jakarta Sans",
    fontSize: 16,
  },
});

type ColoringPageDocumentProps = {
  imageSvg: string;
  qrCodeSvg: string;
  coloringImageId: string;
  coloredImageDataUrl?: string | null;
};

const ColoringPageDocument = ({
  imageSvg,
  qrCodeSvg,
  coloringImageId,
  coloredImageDataUrl,
}: ColoringPageDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.main}>
          {coloredImageDataUrl ? (
            <Image src={coloredImageDataUrl} style={styles.coloredImage} />
          ) : (
            <SvgToReactPdf svgString={imageSvg} style={styles.coloringImage} />
          )}
        </View>
        <View style={styles.footer}>
          <SvgToReactPdf svgString={qrCodeSvg} style={styles.qrCodeImage} />
          <View style={styles.cta}>
            <Text style={styles.ctaText}>
              More pages. More calm. Scan to explore.
            </Text>
            <Link
              src={`https://coloringhabitat.com?utm_source=${coloringImageId}&utm_medium=pdf-link&utm_campaign=coloring-image-pdf`}
              style={styles.ctaLink}
            >
              www.coloringhabitat.com
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ColoringPageDocument;
