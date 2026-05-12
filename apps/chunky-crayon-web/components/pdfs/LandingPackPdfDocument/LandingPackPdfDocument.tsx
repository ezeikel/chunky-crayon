import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import SvgToReactPdf from '@/components/SvgToReactPdf/SvgToReactPdf';

// Absolute font URLs — @react-pdf/renderer runs server-side, so relative
// paths can't resolve. Same pattern BundlePdfDocument uses.
Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
});

export type LandingPackPage = {
  /** Coloring image title — currently unused on the printed page but
   * threaded through so a future variant can show it as a header. */
  title: string;
  /** Raw SVG string of the coloring page line art. */
  svgContent: string;
};

export type LandingPackPdfDocumentProps = {
  /** Landing page H1 (becomes the cover title). */
  title: string;
  /** Landing page tagline (cover subtitle). */
  tagline: string;
  /** Coloring pages making up the interior, in original gallery order. */
  pages: LandingPackPage[];
  /** Pre-rendered QR-code SVG string. Drives anyone holding a printed
   * sheet back to the originating landing page. */
  qrCodeSvg: string;
  /** The /coloring-pages/{slug} landing this pack came from. Shown in
   * the footer next to the QR so a reader knows where to scan to. */
  landingUrl: string;
};

// Brand colours from the design system (kept inline because @react-pdf/renderer
// can't read CSS vars). If these drift in tailwind config, update here too.
const CRAYON_ORANGE = '#E37748';
const PAPER_CREAM = '#FFFAF5';

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: CRAYON_ORANGE,
    padding: 48,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverInner: {
    backgroundColor: PAPER_CREAM,
    width: '100%',
    height: '100%',
    borderRadius: 24,
    padding: 48,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBrand: {
    fontFamily: 'Tondo Bold',
    fontSize: 14,
    color: CRAYON_ORANGE,
    letterSpacing: 3,
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 36,
    color: '#222222',
    textAlign: 'center',
    lineHeight: 1.2,
    marginBottom: 16,
  },
  coverTagline: {
    fontFamily: 'Rooney Sans',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.4,
    maxWidth: 380,
  },
  coverPageCount: {
    position: 'absolute',
    bottom: 56,
    fontFamily: 'Rooney Sans',
    fontSize: 11,
    color: '#999999',
    letterSpacing: 1,
  },
  page: {
    backgroundColor: '#FFFFFF',
    padding: 36,
    flexDirection: 'column',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coloringImage: {
    width: '100%',
    height: 'auto',
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1 solid #EEEEEE',
    paddingTop: 10,
  },
  footerText: {
    fontFamily: 'Tondo Bold',
    fontSize: 9,
    color: '#999999',
    flex: 1,
    paddingRight: 12,
  },
  footerQrCode: {
    width: 48,
    height: 48,
  },
});

const LandingPackPdfDocument = ({
  title,
  tagline,
  pages,
  qrCodeSvg,
  landingUrl,
}: LandingPackPdfDocumentProps) => {
  return (
    <Document title={title} author="Chunky Crayon">
      <Page size="A4" orientation="portrait" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <Text style={styles.coverBrand}>Chunky Crayon</Text>
          <Text style={styles.coverTitle}>{title}</Text>
          <Text style={styles.coverTagline}>{tagline}</Text>
        </View>
        <Text style={styles.coverPageCount}>
          {pages.length} page{pages.length === 1 ? '' : 's'} · Free printable ·
          chunkycrayon.com
        </Text>
      </Page>

      {pages.map((p, i) => (
        <Page
          key={`${p.title}-${i}`}
          size="A4"
          orientation="portrait"
          style={styles.page}
        >
          <View style={styles.body}>
            <SvgToReactPdf
              svgString={p.svgContent}
              style={styles.coloringImage}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Free printable from {landingUrl.replace(/^https?:\/\//, '')}
            </Text>
            <SvgToReactPdf svgString={qrCodeSvg} style={styles.footerQrCode} />
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default LandingPackPdfDocument;
