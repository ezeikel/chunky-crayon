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
import { faHeart } from '@fortawesome/pro-thin-svg-icons/faHeart';
import { faRocketLaunch } from '@fortawesome/pro-thin-svg-icons/faRocketLaunch';
import { faFish } from '@fortawesome/pro-thin-svg-icons/faFish';
import { faTRex } from '@fortawesome/pro-thin-svg-icons/faTRex';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Thin variants → better match for "colour this shape in" — the shapes
// are mostly outline and the kid's crayon reads as the dominant fill.
//
// NOTE: `shuttle-space-vertical` (from fontawesome.com) isn't exported
// by pro-thin 6.7.2 yet. `faRocketLaunch` is the closest vertical
// space-themed thin icon; swap in faShuttleSpaceVertical when the Pro
// bundle upgrades to a release that includes it.

Font.register({
  family: 'Tondo Bold',
  src: 'https://chunkycrayon.com/fonts/tondo-bold.ttf',
});

Font.register({
  family: 'Rooney Sans',
  src: 'https://chunkycrayon.com/fonts/rooney-sans-regular.ttf',
});

export type RewardChartTheme =
  | 'stars'
  | 'unicorn'
  | 'space'
  | 'ocean'
  | 'dinosaur';

type ShapeKind = 'star' | 'heart' | 'rocket' | 'fish' | 'trex';

type ThemeStyle = {
  primary: string; // header + outlines
  secondary: string; // row highlights
  accent: string; // shape outline
  shape: ShapeKind; // reward shape drawn in each cell
  label: string; // theme label shown in header
};

const THEMES: Record<RewardChartTheme, ThemeStyle> = {
  stars: {
    primary: '#F86A2F',
    secondary: '#FFE8D4',
    accent: '#F2A93B',
    shape: 'star',
    label: 'Superstar',
  },
  unicorn: {
    primary: '#D05CAC',
    secondary: '#FCE4F5',
    accent: '#C34F9E',
    shape: 'heart',
    label: 'Unicorn Magic',
  },
  space: {
    primary: '#3A3D98',
    secondary: '#E3E6FF',
    accent: '#3A3D98',
    shape: 'rocket',
    label: 'Space Explorer',
  },
  ocean: {
    primary: '#0F7D9E',
    secondary: '#D6F1FA',
    accent: '#0F7D9E',
    shape: 'fish',
    label: 'Ocean Adventure',
  },
  dinosaur: {
    primary: '#3E8948',
    secondary: '#E4F3DC',
    accent: '#3E8948',
    shape: 'trex',
    label: 'Dino Explorer',
  },
};

// Font Awesome Pro Regular icon definitions (the outline weights — best
// for "color in the shape" reward stamps). Each FA icon exposes
// `.icon = [width, height, ligatures, unicode, path]`, and path can be
// a string (solid/regular) or [secondary, primary] (duotone). We use
// regular, so path is a single string.
const FA_ICONS: Record<ShapeKind, IconDefinition> = {
  star: faStar,
  heart: faHeart,
  rocket: faRocketLaunch,
  fish: faFish,
  trex: faTRex,
};

/**
 * Render a Font Awesome icon into a React-PDF <Svg>. React-PDF can't
 * consume <FontAwesomeIcon> (which emits DOM SVG), but the raw icon
 * object gives us the viewBox dimensions + path data directly, so we
 * hand that to <Svg><Path /></Svg>. Stroke + no fill = a clean
 * coloring outline the kid fills in.
 */
const RewardShape: React.FC<{ shape: ShapeKind; color: string }> = ({
  shape,
  color,
}) => {
  const def = FA_ICONS[shape];
  const [iconW, iconH, , , pathData] = def.icon;
  const path = Array.isArray(pathData) ? pathData.join(' ') : pathData;
  const size = 34;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${iconW} ${iconH}`}>
      {/* Low fill opacity so the outline is clearly visible but a crayon
          stroke easily covers it — this is a reward CHART, not decoration. */}
      <Path d={path} fill={color} fillOpacity={0.25} />
    </Svg>
  );
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SHAPE_LABEL: Record<ShapeKind, string> = {
  star: 'star',
  heart: 'heart',
  rocket: 'rocket',
  fish: 'fish',
  trex: 'T-Rex',
};

export type RewardChartPdfDocumentProps = {
  childName: string;
  theme: RewardChartTheme;
  behaviors: string[]; // 1–7 entries
  days: 5 | 7;
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    borderBottom: '3 solid',
    paddingBottom: 18,
  },
  hero: {
    fontFamily: 'Tondo Bold',
    fontSize: 42,
    letterSpacing: -1,
  },
  subhero: {
    fontFamily: 'Rooney Sans',
    fontSize: 16,
    marginTop: 4,
    color: '#555',
  },
  chart: {
    marginTop: 12,
    borderTop: '1 solid #E6E6E6',
    borderLeft: '1 solid #E6E6E6',
  },
  row: {
    flexDirection: 'row',
  },
  cellHeader: {
    padding: 8,
    fontFamily: 'Tondo Bold',
    fontSize: 11,
    textAlign: 'center',
    borderRight: '1 solid #E6E6E6',
    borderBottom: '1 solid #E6E6E6',
  },
  cellBehavior: {
    padding: 10,
    fontFamily: 'Rooney Sans',
    fontSize: 12,
    borderRight: '1 solid #E6E6E6',
    borderBottom: '1 solid #E6E6E6',
  },
  cellBox: {
    padding: 10,
    borderRight: '1 solid #E6E6E6',
    borderBottom: '1 solid #E6E6E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTop: '1 solid #EEE',
  },
  footerText: {
    fontFamily: 'Rooney Sans',
    fontSize: 10,
    color: '#888',
  },
  brandText: {
    fontFamily: 'Tondo Bold',
    fontSize: 12,
  },
});

/**
 * Landscape A4 reward chart. Behaviors run down rows, days across columns.
 * Each cell is a faint star the kid colors in when they earn the reward.
 * No AI, no external assets — ships fast and is COPPA-safe (name + text only,
 * never persisted server-side).
 */
const RewardChartPdfDocument = ({
  childName,
  theme,
  behaviors,
  days,
}: RewardChartPdfDocumentProps) => {
  const themeStyle = THEMES[theme];
  const dayLabels = DAY_LABELS.slice(0, days);
  const cleanName = (childName || 'Little Star').trim().slice(0, 40);
  const cleanBehaviors = behaviors
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 7);

  // Column widths: first col (behavior label) wider, rest even.
  const BEHAVIOR_COL_WIDTH = 200;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View
          style={[styles.header, { borderBottomColor: themeStyle.primary }]}
        >
          <Text style={[styles.hero, { color: themeStyle.primary }]}>
            {cleanName}
            {"'s "}
            {themeStyle.label} Chart
          </Text>
          <Text style={styles.subhero}>
            Color in a {SHAPE_LABEL[themeStyle.shape]} every time you earn it!
          </Text>
        </View>

        {/* Chart */}
        <View style={styles.chart}>
          {/* Header row */}
          <View style={styles.row}>
            <View
              style={[
                styles.cellHeader,
                {
                  width: BEHAVIOR_COL_WIDTH,
                  backgroundColor: themeStyle.secondary,
                },
              ]}
            >
              <Text>Behavior</Text>
            </View>
            {dayLabels.map((d) => (
              <View
                key={d}
                style={[
                  styles.cellHeader,
                  {
                    flex: 1,
                    backgroundColor: themeStyle.secondary,
                    color: themeStyle.primary,
                  },
                ]}
              >
                <Text>{d}</Text>
              </View>
            ))}
          </View>

          {/* Behavior rows */}
          {cleanBehaviors.map((behavior, rowIdx) => (
            <View key={`${behavior}-${rowIdx}`} style={styles.row}>
              <View
                style={[
                  styles.cellBehavior,
                  { width: BEHAVIOR_COL_WIDTH, minHeight: 56 },
                ]}
              >
                <Text>{behavior}</Text>
              </View>
              {dayLabels.map((d) => (
                <View
                  key={d}
                  style={[styles.cellBox, { flex: 1, minHeight: 56 }]}
                >
                  <RewardShape
                    shape={themeStyle.shape}
                    color={themeStyle.accent}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Free printable from{' '}
            <Text style={[styles.brandText, { color: themeStyle.primary }]}>
              Chunky Crayon
            </Text>{' '}
            . Make your own custom coloring pages at{' '}
            <Link src="https://chunkycrayon.com">chunkycrayon.com</Link>
          </Text>
          <Text style={[styles.brandText, { color: themeStyle.primary }]}>
            chunkycrayon.com
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default RewardChartPdfDocument;
