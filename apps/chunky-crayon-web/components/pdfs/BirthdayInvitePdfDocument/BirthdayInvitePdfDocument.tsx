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
import { faStar } from '@fortawesome/pro-thin-svg-icons/faStar';
import { faBalloons } from '@fortawesome/pro-thin-svg-icons/faBalloons';
import { faCakeCandles } from '@fortawesome/pro-thin-svg-icons/faCakeCandles';
import { faGift } from '@fortawesome/pro-thin-svg-icons/faGift';
import { faGifts } from '@fortawesome/pro-thin-svg-icons/faGifts';
import { faCrown } from '@fortawesome/pro-thin-svg-icons/faCrown';
import { faIceCream } from '@fortawesome/pro-thin-svg-icons/faIceCream';
import { faRocketLaunch } from '@fortawesome/pro-thin-svg-icons/faRocketLaunch';
import { faTRex } from '@fortawesome/pro-thin-svg-icons/faTRex';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
});

export type BirthdayInviteTheme = 'rainbow' | 'unicorn' | 'dinosaur' | 'space';

export type BirthdayInvitePdfDocumentProps = {
  childName: string;
  age: number | null; // optional, null = "birthday" without age
  date: string; // free-form user-entered date, e.g. "Saturday 3rd May"
  time: string; // e.g. "2pm – 4pm"
  location: string; // free-form address / venue
  rsvp?: string; // optional RSVP line
  theme: BirthdayInviteTheme;
  fourUp: boolean; // 4-up layout on one letter page, or 1-up large invite
};

type ThemeStyle = {
  primary: string; // hero title color
  accent: string; // decorative outline color
  secondary: string; // soft background tint
  heroIcon: IconDefinition;
  decoIcons: IconDefinition[]; // ~5 icons scattered around the card
};

const THEMES: Record<BirthdayInviteTheme, ThemeStyle> = {
  rainbow: {
    primary: '#F86A2F',
    accent: '#F2A93B',
    secondary: '#FFF4E8',
    heroIcon: faBalloons,
    decoIcons: [faStar, faCakeCandles, faGift, faGifts, faIceCream],
  },
  unicorn: {
    primary: '#D05CAC',
    accent: '#C34F9E',
    secondary: '#FCE4F5',
    heroIcon: faCrown,
    decoIcons: [faStar, faGift, faIceCream, faCakeCandles, faGifts],
  },
  dinosaur: {
    primary: '#3E8948',
    accent: '#3E8948',
    secondary: '#E4F3DC',
    heroIcon: faTRex,
    decoIcons: [faStar, faGift, faCakeCandles, faGifts, faIceCream],
  },
  space: {
    primary: '#3A3D98',
    accent: '#3A3D98',
    secondary: '#E3E6FF',
    heroIcon: faRocketLaunch,
    decoIcons: [faStar, faGift, faCakeCandles, faGifts, faIceCream],
  },
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  card: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFour: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardOuter: {
    borderWidth: 2,
    borderRadius: 18,
    margin: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  hero: {
    fontFamily: 'Tondo Bold',
    letterSpacing: -1,
    textAlign: 'center',
  },
  name: {
    fontFamily: 'Tondo Bold',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 8,
  },
  detail: {
    fontFamily: 'Rooney Sans',
    textAlign: 'center',
    marginTop: 4,
  },
  detailLabel: {
    fontFamily: 'Tondo Bold',
  },
  footer: {
    fontFamily: 'Rooney Sans',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
});

/**
 * Render a Font Awesome icon as a React-PDF <Svg>. Same helper used in
 * RewardChartPdfDocument — FA icon objects expose `.icon = [w, h, ..., path]`.
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

type CardSizeTokens = {
  heroSize: number;
  decoSize: number;
  titleFont: number;
  nameFont: number;
  detailFont: number;
  footerSpace: number;
};

const TOKENS_1UP: CardSizeTokens = {
  heroSize: 180,
  decoSize: 40,
  titleFont: 54,
  nameFont: 38,
  detailFont: 18,
  footerSpace: 10,
};

const TOKENS_4UP: CardSizeTokens = {
  heroSize: 90,
  decoSize: 22,
  titleFont: 28,
  nameFont: 20,
  detailFont: 11,
  footerSpace: 6,
};

const InviteCard: React.FC<{
  props: BirthdayInvitePdfDocumentProps;
  tokens: CardSizeTokens;
}> = ({ props, tokens }) => {
  const theme = THEMES[props.theme];
  const cleanName = (props.childName || 'Your Child').trim().slice(0, 30);
  const ageSuffix = (() => {
    if (!props.age) return '';
    const n = props.age;
    const last = n % 10;
    const tens = Math.floor((n % 100) / 10);
    if (tens === 1) return 'th';
    if (last === 1) return 'st';
    if (last === 2) return 'nd';
    if (last === 3) return 'rd';
    return 'th';
  })();

  const cardPadding = tokens === TOKENS_4UP ? styles.cardFour : styles.card;

  return (
    <View
      style={[
        cardPadding,
        styles.cardOuter,
        {
          borderColor: theme.accent,
          backgroundColor: theme.secondary,
        },
      ]}
    >
      {/* Top decorative row */}
      <View style={styles.topRow}>
        <Icon
          icon={theme.decoIcons[0]}
          size={tokens.decoSize}
          color={theme.accent}
        />
        <Icon
          icon={theme.decoIcons[1]}
          size={tokens.decoSize}
          color={theme.accent}
        />
        <Icon
          icon={theme.decoIcons[2]}
          size={tokens.decoSize}
          color={theme.accent}
        />
      </View>

      {/* Hero "You're Invited" */}
      <View style={{ alignItems: 'center' }}>
        <Text
          style={[
            styles.hero,
            { fontSize: tokens.titleFont, color: theme.primary },
          ]}
        >
          You&apos;re Invited!
        </Text>
        <View style={{ marginTop: 8 }}>
          <Icon
            icon={theme.heroIcon}
            size={tokens.heroSize}
            color={theme.primary}
          />
        </View>
        <Text
          style={[
            styles.name,
            { fontSize: tokens.nameFont, color: theme.primary },
          ]}
        >
          {props.age
            ? `${cleanName}'s ${props.age}${ageSuffix} Birthday`
            : `${cleanName}'s Birthday`}
        </Text>
      </View>

      {/* Details */}
      <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
        {props.date ? (
          <Text
            style={[
              styles.detail,
              { fontSize: tokens.detailFont, color: theme.primary },
            ]}
          >
            <Text style={styles.detailLabel}>When: </Text>
            {props.date}
            {props.time ? `, ${props.time}` : ''}
          </Text>
        ) : null}
        {props.location ? (
          <Text
            style={[
              styles.detail,
              { fontSize: tokens.detailFont, color: theme.primary },
            ]}
          >
            <Text style={styles.detailLabel}>Where: </Text>
            {props.location}
          </Text>
        ) : null}
        {props.rsvp ? (
          <Text
            style={[
              styles.detail,
              { fontSize: tokens.detailFont, color: theme.primary },
            ]}
          >
            <Text style={styles.detailLabel}>RSVP: </Text>
            {props.rsvp}
          </Text>
        ) : null}
      </View>

      {/* Bottom decorative row */}
      <View style={styles.topRow}>
        <Icon
          icon={theme.decoIcons[3]}
          size={tokens.decoSize}
          color={theme.accent}
        />
        <Icon
          icon={theme.decoIcons[4]}
          size={tokens.decoSize}
          color={theme.accent}
        />
        <Icon
          icon={theme.decoIcons[0]}
          size={tokens.decoSize}
          color={theme.accent}
        />
      </View>

      {tokens === TOKENS_1UP && (
        <Text style={[styles.footer, { marginTop: tokens.footerSpace }]}>
          Free printable from Chunky Crayon ·{' '}
          <Link src="https://chunkycrayon.com">chunkycrayon.com</Link>
        </Text>
      )}
    </View>
  );
};

const BirthdayInvitePdfDocument: React.FC<BirthdayInvitePdfDocumentProps> = (
  props,
) => {
  if (props.fourUp) {
    return (
      <Document>
        <Page size="LETTER" style={styles.page}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: '50%',
                  height: '50%',
                }}
              >
                <InviteCard props={props} tokens={TOKENS_4UP} />
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <InviteCard props={props} tokens={TOKENS_1UP} />
      </Page>
    </Document>
  );
};

export default BirthdayInvitePdfDocument;
