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
import { faAppleWhole } from '@fortawesome/pro-thin-svg-icons/faAppleWhole';
import { faBaseball } from '@fortawesome/pro-thin-svg-icons/faBaseball';
import { faCat } from '@fortawesome/pro-thin-svg-icons/faCat';
import { faDog } from '@fortawesome/pro-thin-svg-icons/faDog';
import { faEgg } from '@fortawesome/pro-thin-svg-icons/faEgg';
import { faFish } from '@fortawesome/pro-thin-svg-icons/faFish';
import { faGift } from '@fortawesome/pro-thin-svg-icons/faGift';
import { faHeart } from '@fortawesome/pro-thin-svg-icons/faHeart';
import { faIceCream } from '@fortawesome/pro-thin-svg-icons/faIceCream';
import { faJetFighter } from '@fortawesome/pro-thin-svg-icons/faJetFighter';
import { faKey } from '@fortawesome/pro-thin-svg-icons/faKey';
import { faLeaf } from '@fortawesome/pro-thin-svg-icons/faLeaf';
import { faMoon } from '@fortawesome/pro-thin-svg-icons/faMoon';
import { faNewspaper } from '@fortawesome/pro-thin-svg-icons/faNewspaper';
import { faOctopus } from '@fortawesome/pro-thin-svg-icons/faOctopus';
import { faPizzaSlice } from '@fortawesome/pro-thin-svg-icons/faPizzaSlice';
import { faQuestion } from '@fortawesome/pro-thin-svg-icons/faQuestion';
import { faRocketLaunch } from '@fortawesome/pro-thin-svg-icons/faRocketLaunch';
import { faStar } from '@fortawesome/pro-thin-svg-icons/faStar';
import { faTree } from '@fortawesome/pro-thin-svg-icons/faTree';
import { faUmbrella } from '@fortawesome/pro-thin-svg-icons/faUmbrella';
import { faVanShuttle } from '@fortawesome/pro-thin-svg-icons/faVanShuttle';
import { faWatermelonSlice } from '@fortawesome/pro-thin-svg-icons/faWatermelonSlice';
import { faXmark } from '@fortawesome/pro-thin-svg-icons/faXmark';
import { faYinYang } from '@fortawesome/pro-thin-svg-icons/faYinYang';
import { faZzz } from '@fortawesome/pro-thin-svg-icons/faZzz';

Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
});

type LetterEntry = {
  letter: string; // uppercase
  word: string; // e.g. "Apple"
  icon: IconDefinition;
};

// Classic A–Z mapping. Words chosen so every entry has a reliable FA
// Pro thin icon and stays toddler-safe.
const ALPHABET: LetterEntry[] = [
  { letter: 'A', word: 'Apple', icon: faAppleWhole },
  { letter: 'B', word: 'Ball', icon: faBaseball },
  { letter: 'C', word: 'Cat', icon: faCat },
  { letter: 'D', word: 'Dog', icon: faDog },
  { letter: 'E', word: 'Egg', icon: faEgg },
  { letter: 'F', word: 'Fish', icon: faFish },
  { letter: 'G', word: 'Gift', icon: faGift },
  { letter: 'H', word: 'Heart', icon: faHeart },
  { letter: 'I', word: 'Ice cream', icon: faIceCream },
  { letter: 'J', word: 'Jet', icon: faJetFighter },
  { letter: 'K', word: 'Key', icon: faKey },
  { letter: 'L', word: 'Leaf', icon: faLeaf },
  { letter: 'M', word: 'Moon', icon: faMoon },
  { letter: 'N', word: 'Newspaper', icon: faNewspaper },
  { letter: 'O', word: 'Octopus', icon: faOctopus },
  { letter: 'P', word: 'Pizza', icon: faPizzaSlice },
  { letter: 'Q', word: 'Question', icon: faQuestion },
  { letter: 'R', word: 'Rocket', icon: faRocketLaunch },
  { letter: 'S', word: 'Star', icon: faStar },
  { letter: 'T', word: 'Tree', icon: faTree },
  { letter: 'U', word: 'Umbrella', icon: faUmbrella },
  { letter: 'V', word: 'Van', icon: faVanShuttle },
  { letter: 'W', word: 'Watermelon', icon: faWatermelonSlice },
  { letter: 'X', word: 'X mark', icon: faXmark },
  { letter: 'Y', word: 'Yin Yang', icon: faYinYang },
  { letter: 'Z', word: 'Zzz', icon: faZzz },
];

export type AbcTracingPdfDocumentProps = {
  /** Optional child name for the cover page. */
  childName?: string;
  /** "upper" shows A–Z, "lower" shows a–z, "both" shows both stacked. */
  case: 'upper' | 'lower' | 'both';
};

const PRIMARY = '#F86A2F';
const CHARCOAL = '#212121';
const TRACE_GREY = '#D0D0D0'; // faint outline colour — dark enough to see, light enough to trace over

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 36,
    flexDirection: 'column',
  },
  // Cover
  cover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  coverTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 72,
    color: PRIMARY,
    letterSpacing: -2,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontFamily: 'Rooney Sans',
    fontSize: 20,
    color: CHARCOAL,
    opacity: 0.8,
    marginTop: 14,
    textAlign: 'center',
  },
  coverName: {
    fontFamily: 'Tondo Bold',
    fontSize: 38,
    color: CHARCOAL,
    marginTop: 36,
    textAlign: 'center',
  },
  // Letter page
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'Tondo Bold',
    fontSize: 36,
    color: PRIMARY,
    letterSpacing: -1,
  },
  headerSmall: {
    fontFamily: 'Rooney Sans',
    fontSize: 12,
    color: '#999',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 32,
  },
  letterBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traceRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
 * Render a Font Awesome icon as a React-PDF <Svg>. Same helper pattern as
 * the other tools — FA icons expose `.icon = [w, h, ..., path]`.
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

/**
 * Big letter for tracing. React-PDF's <Text> doesn't expose stroke, so
 * we render a large filled letter in a light grey — visible enough to
 * guide a small hand, light enough for a crayon to trace straight over.
 */
const TraceLetter: React.FC<{ letter: string; fontSize: number }> = ({
  letter,
  fontSize,
}) => (
  <Text
    style={{
      fontFamily: 'Tondo Bold',
      fontSize,
      color: TRACE_GREY,
      letterSpacing: -2,
    }}
  >
    {letter}
  </Text>
);

const LetterPage: React.FC<{
  entry: LetterEntry;
  caseMode: AbcTracingPdfDocumentProps['case'];
  pageNum: number;
  total: number;
}> = ({ entry, caseMode, pageNum, total }) => {
  const upper = entry.letter;
  const lower = entry.letter.toLowerCase();

  return (
    <Page size="LETTER" orientation="landscape" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {upper} is for {entry.word}
        </Text>
        <Text style={styles.headerSmall}>
          Page {pageNum} of {total}
        </Text>
      </View>

      {/* Body: big letter on the left, illustration on the right */}
      <View style={styles.body}>
        <View style={styles.letterBlock}>
          {caseMode === 'both' ? (
            <>
              <TraceLetter letter={upper} fontSize={280} />
              <TraceLetter letter={lower} fontSize={220} />
            </>
          ) : caseMode === 'lower' ? (
            <TraceLetter letter={lower} fontSize={420} />
          ) : (
            <TraceLetter letter={upper} fontSize={420} />
          )}
        </View>
        <View style={styles.iconBlock}>
          <Icon
            icon={entry.icon}
            size={280}
            color={PRIMARY}
            fillOpacity={0.2}
          />
          <Text
            style={{
              fontFamily: 'Tondo Bold',
              fontSize: 22,
              color: PRIMARY,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {entry.word}
          </Text>
        </View>
      </View>

      {/* Tracing row — 5 smaller copies of the letter for hand practice */}
      <View style={styles.traceRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TraceLetter
            key={i}
            letter={caseMode === 'lower' ? lower : upper}
            fontSize={64}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ABC Tracing · Free printable from Chunky Crayon
        </Text>
        <Text style={styles.footerText}>
          <Link src="https://chunkycrayon.com">chunkycrayon.com</Link>
        </Text>
      </View>
    </Page>
  );
};

const AbcTracingPdfDocument: React.FC<AbcTracingPdfDocumentProps> = ({
  childName,
  case: caseMode,
}) => {
  const cleanName = (childName ?? '').trim().slice(0, 40);
  const total = ALPHABET.length + 1; // +1 for cover

  return (
    <Document>
      {/* Cover page */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverTitle}>ABC Tracing</Text>
          <Text style={styles.coverSubtitle}>
            A–Z practice pages with a word, a picture, and space to trace.
          </Text>
          {cleanName ? (
            <Text style={styles.coverName}>for {cleanName}</Text>
          ) : null}
          <View style={{ marginTop: 40 }}>
            <Icon icon={faStar} size={120} color={PRIMARY} fillOpacity={0.4} />
          </View>
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

      {/* A–Z */}
      {ALPHABET.map((entry, i) => (
        <LetterPage
          key={entry.letter}
          entry={entry}
          caseMode={caseMode}
          pageNum={i + 2}
          total={total}
        />
      ))}
    </Document>
  );
};

export default AbcTracingPdfDocument;
