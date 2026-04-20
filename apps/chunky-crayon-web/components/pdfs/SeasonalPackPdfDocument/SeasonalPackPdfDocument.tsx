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
// Halloween
import { faPumpkin } from '@fortawesome/pro-thin-svg-icons/faPumpkin';
import { faGhost } from '@fortawesome/pro-thin-svg-icons/faGhost';
import { faBat } from '@fortawesome/pro-thin-svg-icons/faBat';
import { faSpider } from '@fortawesome/pro-thin-svg-icons/faSpider';
import { faHatWitch } from '@fortawesome/pro-thin-svg-icons/faHatWitch';
import { faCandy } from '@fortawesome/pro-thin-svg-icons/faCandy';
import { faMoon } from '@fortawesome/pro-thin-svg-icons/faMoon';
import { faCat } from '@fortawesome/pro-thin-svg-icons/faCat';
// Christmas
import { faTreeChristmas } from '@fortawesome/pro-thin-svg-icons/faTreeChristmas';
import { faGift } from '@fortawesome/pro-thin-svg-icons/faGift';
import { faCandyCane } from '@fortawesome/pro-thin-svg-icons/faCandyCane';
import { faSnowman } from '@fortawesome/pro-thin-svg-icons/faSnowman';
import { faBell } from '@fortawesome/pro-thin-svg-icons/faBell';
import { faStar } from '@fortawesome/pro-thin-svg-icons/faStar';
import { faSnowflake } from '@fortawesome/pro-thin-svg-icons/faSnowflake';
import { faStocking } from '@fortawesome/pro-thin-svg-icons/faStocking';
import { faSleigh } from '@fortawesome/pro-thin-svg-icons/faSleigh';
import { faHollyBerry } from '@fortawesome/pro-thin-svg-icons/faHollyBerry';
// Valentine
import { faHeart } from '@fortawesome/pro-thin-svg-icons/faHeart';
import { faRibbon } from '@fortawesome/pro-thin-svg-icons/faRibbon';
import { faEnvelope } from '@fortawesome/pro-thin-svg-icons/faEnvelope';
import { faFlower } from '@fortawesome/pro-thin-svg-icons/faFlower';
import { faFlowerTulip } from '@fortawesome/pro-thin-svg-icons/faFlowerTulip';
// Easter
import { faEgg } from '@fortawesome/pro-thin-svg-icons/faEgg';
import { faRabbit } from '@fortawesome/pro-thin-svg-icons/faRabbit';
import { faFlowerDaffodil } from '@fortawesome/pro-thin-svg-icons/faFlowerDaffodil';
import { faCarrot } from '@fortawesome/pro-thin-svg-icons/faCarrot';
import { faLeaf } from '@fortawesome/pro-thin-svg-icons/faLeaf';
import { faTree } from '@fortawesome/pro-thin-svg-icons/faTree';
// Thanksgiving
import { faTurkey } from '@fortawesome/pro-thin-svg-icons/faTurkey';
import { faPie } from '@fortawesome/pro-thin-svg-icons/faPie';
import { faCorn } from '@fortawesome/pro-thin-svg-icons/faCorn';
import { faWheatAwn } from '@fortawesome/pro-thin-svg-icons/faWheatAwn';
import { faHatChef } from '@fortawesome/pro-thin-svg-icons/faHatChef';
import { faAppleWhole } from '@fortawesome/pro-thin-svg-icons/faAppleWhole';
// Back to school
import { faBackpack } from '@fortawesome/pro-thin-svg-icons/faBackpack';
import { faPencil } from '@fortawesome/pro-thin-svg-icons/faPencil';
import { faBook } from '@fortawesome/pro-thin-svg-icons/faBook';
import { faBookOpen } from '@fortawesome/pro-thin-svg-icons/faBookOpen';
import { faRuler } from '@fortawesome/pro-thin-svg-icons/faRuler';
import { faScissors } from '@fortawesome/pro-thin-svg-icons/faScissors';
import { faChalkboard } from '@fortawesome/pro-thin-svg-icons/faChalkboard';
import { faAbacus } from '@fortawesome/pro-thin-svg-icons/faAbacus';
import { faMarker } from '@fortawesome/pro-thin-svg-icons/faMarker';

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

type PackEntry = {
  label: string; // page subtitle, e.g. "Pumpkin"
  icon: IconDefinition;
};

type PackConfig = {
  /** Hero copy shown on cover page and page headers. */
  title: string;
  /** Short description shown on cover. */
  subtitle: string;
  /** Primary brand colour for this pack. */
  primary: string;
  /** Soft accent colour. */
  accent: string;
  /** Ordered list of pages in the bundle. */
  entries: PackEntry[];
};

const PACKS: Record<SeasonalPack, PackConfig> = {
  halloween: {
    title: 'Halloween Coloring Pack',
    subtitle: 'Friendly pumpkins, ghosts, bats — nothing scary.',
    primary: '#F86A2F',
    accent: '#7B3F99',
    entries: [
      { label: 'Pumpkin', icon: faPumpkin },
      { label: 'Ghost', icon: faGhost },
      { label: 'Bat', icon: faBat },
      { label: 'Spider', icon: faSpider },
      { label: 'Witch Hat', icon: faHatWitch },
      { label: 'Candy', icon: faCandy },
      { label: 'Moon', icon: faMoon },
      { label: 'Black Cat', icon: faCat },
    ],
  },
  christmas: {
    title: 'Christmas Coloring Pack',
    subtitle: 'Trees, gifts, snowmen and all the festive favourites.',
    primary: '#C1272D',
    accent: '#0F7D3A',
    entries: [
      { label: 'Christmas Tree', icon: faTreeChristmas },
      { label: 'Gift', icon: faGift },
      { label: 'Candy Cane', icon: faCandyCane },
      { label: 'Snowman', icon: faSnowman },
      { label: 'Bell', icon: faBell },
      { label: 'Star', icon: faStar },
      { label: 'Snowflake', icon: faSnowflake },
      { label: 'Stocking', icon: faStocking },
      { label: 'Sleigh', icon: faSleigh },
      { label: 'Holly', icon: faHollyBerry },
    ],
  },
  valentine: {
    title: "Valentine's Coloring Pack",
    subtitle: 'Hearts, flowers and friendly love for all ages.',
    primary: '#D05CAC',
    accent: '#E6527A',
    entries: [
      { label: 'Heart', icon: faHeart },
      { label: 'Ribbon', icon: faRibbon },
      { label: 'Love Letter', icon: faEnvelope },
      { label: 'Flower', icon: faFlower },
      { label: 'Tulip', icon: faFlowerTulip },
      { label: 'Gift', icon: faGift },
    ],
  },
  easter: {
    title: 'Easter Coloring Pack',
    subtitle: 'Spring critters, flowers and decorated eggs.',
    primary: '#F2A93B',
    accent: '#7BA05B',
    entries: [
      { label: 'Easter Egg', icon: faEgg },
      { label: 'Rabbit', icon: faRabbit },
      { label: 'Flower', icon: faFlower },
      { label: 'Daffodil', icon: faFlowerDaffodil },
      { label: 'Tulip', icon: faFlowerTulip },
      { label: 'Carrot', icon: faCarrot },
      { label: 'Spring Leaf', icon: faLeaf },
      { label: 'Tree in Bloom', icon: faTree },
    ],
  },
  thanksgiving: {
    title: 'Thanksgiving Coloring Pack',
    subtitle: 'Turkeys, pumpkin pie and autumn harvest scenes.',
    primary: '#B36A2B',
    accent: '#D46A3E',
    entries: [
      { label: 'Turkey', icon: faTurkey },
      { label: 'Pumpkin Pie', icon: faPie },
      { label: 'Pumpkin', icon: faPumpkin },
      { label: 'Autumn Leaf', icon: faLeaf },
      { label: 'Corn on the Cob', icon: faCorn },
      { label: 'Wheat', icon: faWheatAwn },
      { label: 'Chef Hat', icon: faHatChef },
      { label: 'Apple', icon: faAppleWhole },
    ],
  },
  'back-to-school': {
    title: 'Back-to-School Coloring Pack',
    subtitle: 'Classroom essentials and first-day favourites.',
    primary: '#3A3D98',
    accent: '#F2A93B',
    entries: [
      { label: 'Backpack', icon: faBackpack },
      { label: 'Pencil', icon: faPencil },
      { label: 'Crayon', icon: faMarker },
      { label: 'Book', icon: faBook },
      { label: 'Open Book', icon: faBookOpen },
      { label: 'Apple for Teacher', icon: faAppleWhole },
      { label: 'Ruler', icon: faRuler },
      { label: 'Scissors', icon: faScissors },
      { label: 'Chalkboard', icon: faChalkboard },
      { label: 'Abacus', icon: faAbacus },
    ],
  },
};

export const getPackLabel = (pack: SeasonalPack) => PACKS[pack].title;

export type SeasonalPackPdfDocumentProps = {
  pack: SeasonalPack;
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
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 32,
    letterSpacing: -1,
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
  label: {
    fontFamily: 'Tondo Bold',
    fontSize: 28,
    marginTop: 24,
    textAlign: 'center',
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

/**
 * Render a Font Awesome icon as a React-PDF <Svg>. FA icons expose
 * `.icon = [width, height, ..., path]`.
 */
const Icon: React.FC<{
  icon: IconDefinition;
  size: number;
  color: string;
  fillOpacity?: number;
}> = ({ icon, size, color, fillOpacity = 1 }) => {
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
  childName,
}) => {
  const config = PACKS[pack];
  const cleanName = (childName ?? '').trim().slice(0, 40);
  const total = config.entries.length + 1; // +1 for cover

  return (
    <Document>
      {/* Cover */}
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
            <Icon
              icon={config.entries[0].icon}
              size={200}
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
            {config.entries.length} coloring pages · letter size · print-ready
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

      {/* One page per entry */}
      {config.entries.map((entry, i) => (
        <Page
          key={`${entry.label}-${i}`}
          size="LETTER"
          orientation="portrait"
          style={styles.page}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: config.primary }]}>
              {config.title}
            </Text>
            <Text style={styles.headerSmall}>
              Page {i + 2} of {total}
            </Text>
          </View>

          <View style={styles.body}>
            <Icon
              icon={entry.icon}
              size={380}
              color={config.accent}
              fillOpacity={0.18}
            />
            <Text style={[styles.label, { color: config.primary }]}>
              {entry.label}
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
      ))}
    </Document>
  );
};

export default SeasonalPackPdfDocument;
