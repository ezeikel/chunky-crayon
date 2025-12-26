import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
  Font,
} from '@react-pdf/renderer';
import SvgToReactPdf from '@/components/SvgToReactPdf/SvgToReactPdf';

Font.register({
  family: 'Tondo Bold',
  src: '/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: '/fonts/rooney-sans-regular.ttf',
});

// create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  main: {
    flexGrow: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    fontSize: 12,
    lineHeight: 1.5,
  },
  coloringImage: {
    width: '100%', // ensure the SVG fills the available width
    height: 'auto', // maintain the aspect ratio
  },
  coloredImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  qrCodeImage: {
    width: '120px',
    height: '120px',
  },
  cta: {
    display: 'flex',
    flexDirection: 'column',
    justifyItems: 'space-between',
    gap: 4,
    maxWidth: '50%',
  },
  ctaText: {
    fontFamily: 'Tondo Bold',
    fontSize: 18,
  },
  ctaLink: {
    fontFamily: 'Rooney Sans',
    fontSize: 16,
  },
});

// IMPORTANT: This component must NOT use React hooks (useState, useEffect, etc.)
// @react-pdf/renderer uses its own React reconciler which doesn't support hooks.
// All data must be passed as props from the parent component.
type ColoringPageDocumentProps = {
  imageSvg: string;
  qrCodeSvg: string;
  coloringImageId: string;
  coloredImageDataUrl?: string | null; // User's colored artwork as data URL
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
            // Show user's colored artwork if available
            <Image src={coloredImageDataUrl} style={styles.coloredImage} />
          ) : (
            // Fall back to original SVG if no coloring
            <SvgToReactPdf svgString={imageSvg} style={styles.coloringImage} />
          )}
        </View>
        <View style={styles.footer}>
          <SvgToReactPdf svgString={qrCodeSvg} style={styles.qrCodeImage} />
          <View style={styles.cta}>
            <Text style={styles.ctaText}>
              Scan the QR code to discover more coloring pages!
            </Text>
            <Link
              src={`https://chunkycrayon.com?utm_source=${coloringImageId}&utm_medium=pdf-link&utm_campaign=coloring-image-pdf`}
              style={styles.ctaLink}
            >
              www.chunkycrayon.com
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ColoringPageDocument;
