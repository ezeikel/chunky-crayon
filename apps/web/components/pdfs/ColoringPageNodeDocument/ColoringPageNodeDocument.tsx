import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Font,
} from '@react-pdf/renderer';
import SvgToReactPdf from '@/components/SvgToReactPdf/SvgToReactPdf';
import { ColoringImage } from '@chunky-crayon/db/types';

Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
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
  },
  body: {
    fontSize: 12,
    lineHeight: 1.5,
  },
  coloringImage: {
    width: '100%', // ensure the SVG fills the available width
    height: 'auto', // maintain the aspect ratio
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

type ColoringPageNodeDocumentProps = {
  coloringImage: Partial<ColoringImage>;
  imageSvg: string;
  qrCodeSvg: string;
};

const ColoringPageNodeDocument = ({
  coloringImage,
  imageSvg,
  qrCodeSvg,
}: ColoringPageNodeDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.main}>
        <SvgToReactPdf svgString={imageSvg} style={styles.coloringImage} />
      </View>
      <View style={styles.footer}>
        <SvgToReactPdf svgString={qrCodeSvg} style={styles.qrCodeImage} />
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            Scan the QR code to discover more coloring pages!
          </Text>
          <Link
            src={`https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-link&utm_campaign=coloring-image-pdf`}
            style={styles.ctaLink}
          >
            www.chunkycrayon.com
          </Link>
        </View>
      </View>
    </Page>
  </Document>
);

export default ColoringPageNodeDocument;
