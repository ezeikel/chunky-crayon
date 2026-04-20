import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
  Svg,
  Path,
} from '@react-pdf/renderer';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faPumpkin } from '@fortawesome/pro-thin-svg-icons/faPumpkin';
import { faTreeChristmas } from '@fortawesome/pro-thin-svg-icons/faTreeChristmas';
import { faHeart } from '@fortawesome/pro-thin-svg-icons/faHeart';
import { faEgg } from '@fortawesome/pro-thin-svg-icons/faEgg';
import { faTurkey } from '@fortawesome/pro-thin-svg-icons/faTurkey';
import { faBackpack } from '@fortawesome/pro-thin-svg-icons/faBackpack';
import SvgToReactPdf from '@/components/SvgToReactPdf/SvgToReactPdf';

Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
});

export type SeasonalPack =
  | 'halloween'
  | 'christmas'
  | 'valentine'
  | 'easter'
  | 'thanksgiving'
  | 'back-to-school';

export type SeasonalPackConfig = {
  title: string;
  subtitle: string;
  primary: string;
  accent: string;
  tags: string[]; // gallery tags this pack pulls from
  coverIcon: IconDefinition; // decorative only — shown on cover
  targetPageCount: number;
};

/**
 * Pack metadata — the tags determine which real gallery coloring pages
 * get pulled into the bundle. Shared between the API route (which
 * queries) and the tool's page UI (which shows the available packs).
 */
export const PACKS: Record<SeasonalPack, SeasonalPackConfig> = {
  halloween: {
    title: 'Halloween Coloring Pack',
    subtitle: 'Friendly pumpkins, ghosts, bats — nothing scary.',
    primary: '#F86A2F',
    accent: '#7B3F99',
    tags: ['halloween', 'pumpkin', 'ghost'],
    coverIcon: faPumpkin,
    targetPageCount: 8,
  },
  christmas: {
    title: 'Christmas Coloring Pack',
    subtitle: 'Trees, gifts, snowmen and all the festive favourites.',
    primary: '#C1272D',
    accent: '#0F7D3A',
    tags: ['christmas', 'santa', 'winter', 'holidays'],
    coverIcon: faTreeChristmas,
    targetPageCount: 10,
  },
  valentine: {
    title: "Valentine's Coloring Pack",
    subtitle: 'Hearts, flowers and friendly love for all ages.',
    primary: '#D05CAC',
    accent: '#E6527A',
    tags: ['valentine', 'valentines', 'valentines-day', 'love', 'heart'],
    coverIcon: faHeart,
    targetPageCount: 6,
  },
  easter: {
    title: 'Easter Coloring Pack',
    subtitle: 'Spring critters, flowers and decorated eggs.',
    primary: '#F2A93B',
    accent: '#7BA05B',
    tags: ['easter', 'spring', 'bunny', 'egg'],
    coverIcon: faEgg,
    targetPageCount: 8,
  },
  thanksgiving: {
    title: 'Thanksgiving Coloring Pack',
    subtitle: 'Turkeys, pumpkin pie and autumn harvest scenes.',
    primary: '#B36A2B',
    accent: '#D46A3E',
    tags: ['thanksgiving', 'autumn', 'fall', 'turkey', 'harvest'],
    coverIcon: faTurkey,
    targetPageCount: 8,
  },
  'back-to-school': {
    title: 'Back-to-School Coloring Pack',
    subtitle: 'Classroom essentials and first-day favourites.',
    primary: '#3A3D98',
    accent: '#F2A93B',
    tags: ['school', 'back-to-school', 'classroom', 'learning'],
    coverIcon: faBackpack,
    targetPageCount: 10,
  },
};

export const getPackLabel = (pack: SeasonalPack) => PACKS[pack].title;

export type PackPage = {
  /** Coloring image title shown as the page heading. */
  title: string;
  /** Raw SVG string of the coloring page line art. */
  svgContent: string;
};

export type SeasonalPackPdfDocumentProps = {
  pack: SeasonalPack;
  /** Real coloring pages — SVG line art fetched from R2 server-side. */
  pages: PackPage[];
  /** Optional child name for the cover. */
  childName?: string;
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 36,
    flexDirection: 'column',
  },
  cover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  coverTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 56,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontFamily: 'Rooney Sans',
    fontSize: 18,
    opacity: 0.85,
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 520,
  },
  coverName: {
    fontFamily: 'Tondo Bold',
    fontSize: 32,
    marginTop: 32,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    flex: 1,
  },
  headerSmall: {
    fontFamily: 'Rooney Sans',
    fontSize: 12,
    color: '#999',
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
    borderTop: '1 solid #EEE',
    paddingTop: 10,
  },
  footerText: {
    fontFamily: 'Rooney Sans',
    fontSize: 9,
    color: '#999',
  },
});

const CoverIcon: React.FC<{
  icon: IconDefinition;
  size: number;
  color: string;
  fillOpacity: number;
}> = ({ icon, size, color, fillOpacity }) => {
  const [iconW, iconH, , , pathData] = icon.icon;
  const path = Array.isArray(pathData) ? pathData.join(' ') : pathData;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${iconW} ${iconH}`}>
      <Path d={path} fill={color} fillOpacity={fillOpacity} />
    </Svg>
  );
};

const SeasonalPackPdfDocument: React.FC<SeasonalPackPdfDocumentProps> = ({
  pack,
  pages,
  childName,
}) => {
  const config = PACKS[pack];
  const cleanName = (childName ?? '').trim().slice(0, 40);
  const total = pages.length + 1; // +1 for cover

  return (
    <Document>
      {/* Cover — themed, decorative, not a coloring page */}
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <View style={styles.cover}>
          <Text style={[styles.coverTitle, { color: config.primary }]}>
            {config.title}
          </Text>
          <Text style={styles.coverSubtitle}>{config.subtitle}</Text>
          {cleanName ? (
            <Text style={[styles.coverName, { color: config.primary }]}>
              for {cleanName}
            </Text>
          ) : null}
          <View style={{ marginTop: 40 }}>
            <CoverIcon
              icon={config.coverIcon}
              size={220}
              color={config.primary}
              fillOpacity={0.5}
            />
          </View>
          <Text
            style={[
              styles.coverSubtitle,
              { marginTop: 32, fontSize: 14, color: '#999' },
            ]}
          >
            {pages.length} coloring pages · letter size · print-ready
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Free printable from Chunky Crayon
          </Text>
          <Text style={styles.footerText}>
            <Link src="https://chunkycrayon.com">chunkycrayon.com</Link>
          </Text>
        </View>
      </Page>

      {/* One page per real coloring image */}
      {pages.map((p, i) => (
        <Page
          key={`${p.title}-${i}`}
          size="LETTER"
          orientation="portrait"
          style={styles.page}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: config.primary }]}>
              {p.title}
            </Text>
            <Text style={styles.headerSmall}>
              Page {i + 2} of {total}
            </Text>
          </View>

          <View style={styles.body}>
            <SvgToReactPdf
              svgString={p.svgContent}
              style={styles.coloringImage}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Free printable from Chunky Crayon
            </Text>
            <Text style={styles.footerText}>
              <Link src="https://chunkycrayon.com">chunkycrayon.com</Link>
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default SeasonalPackPdfDocument;
