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
  Polygon,
  Circle,
} from '@react-pdf/renderer';

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

type ShapeKind = 'star' | 'heart' | 'rocket' | 'shell' | 'footprint';

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
    shape: 'shell',
    label: 'Ocean Adventure',
  },
  dinosaur: {
    primary: '#3E8948',
    secondary: '#E4F3DC',
    accent: '#3E8948',
    shape: 'footprint',
    label: 'Dino Explorer',
  },
};

/**
 * Each cell draws a single themed outline the kid colors in. Shapes are
 * hand-tuned to a 60×60 viewBox so they render identically across PDF
 * viewers — no font dependency (the previous Unicode-glyph approach
 * was invisible because React-PDF's default font didn't include them).
 */
const RewardShape: React.FC<{ shape: ShapeKind; color: string }> = ({
  shape,
  color,
}) => {
  const size = 34;
  const strokeProps = {
    stroke: color,
    strokeWidth: 2,
    fill: 'none',
  } as const;

  if (shape === 'heart') {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Polygon
          points="30,50 8,28 8,18 18,12 30,22 42,12 52,18 52,28"
          {...strokeProps}
        />
      </Svg>
    );
  }
  if (shape === 'rocket') {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        {/* Simple rocket silhouette: body + fins + nose */}
        <Polygon
          points="30,6 38,22 38,42 46,50 34,50 34,54 26,54 26,50 14,50 22,42 22,22"
          {...strokeProps}
        />
        <Circle cx="30" cy="24" r="3" {...strokeProps} />
      </Svg>
    );
  }
  if (shape === 'shell') {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        {/* Scallop shell outline */}
        <Polygon
          points="30,10 44,22 50,36 44,48 30,54 16,48 10,36 16,22"
          {...strokeProps}
        />
        <Polygon points="30,10 30,54" {...strokeProps} />
        <Polygon points="22,14 30,54 38,14" {...strokeProps} />
      </Svg>
    );
  }
  if (shape === 'footprint') {
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        {/* 3-toed dino footprint */}
        <Polygon
          points="30,50 18,38 20,24 26,14 30,18 34,14 40,24 42,38"
          {...strokeProps}
        />
        <Circle cx="22" cy="14" r="3" {...strokeProps} />
        <Circle cx="30" cy="8" r="3" {...strokeProps} />
        <Circle cx="38" cy="14" r="3" {...strokeProps} />
      </Svg>
    );
  }
  // 5-point star (default)
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Polygon
        points="30,6 37,24 56,24 41,36 46,54 30,43 14,54 19,36 4,24 23,24"
        {...strokeProps}
      />
    </Svg>
  );
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SHAPE_LABEL: Record<ShapeKind, string> = {
  star: 'star',
  heart: 'heart',
  rocket: 'rocket',
  shell: 'shell',
  footprint: 'footprint',
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
            — make your own AI coloring pages at{' '}
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
