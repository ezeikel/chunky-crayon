import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
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

type ThemeStyle = {
  primary: string; // header + outlines
  secondary: string; // row highlights
  accent: string; // sparkle accents
  emoji: string; // hero emoji (rendered as text, uses font fallback)
  label: string; // theme label shown in header
};

const THEMES: Record<RewardChartTheme, ThemeStyle> = {
  stars: {
    primary: '#F86A2F',
    secondary: '#FFE8D4',
    accent: '#FFC857',
    emoji: '★',
    label: 'Superstar',
  },
  unicorn: {
    primary: '#D05CAC',
    secondary: '#FCE4F5',
    accent: '#9C6ADE',
    emoji: '♥',
    label: 'Unicorn Magic',
  },
  space: {
    primary: '#3A3D98',
    secondary: '#E3E6FF',
    accent: '#00BFE0',
    emoji: '★',
    label: 'Space Explorer',
  },
  ocean: {
    primary: '#0F7D9E',
    secondary: '#D6F1FA',
    accent: '#4FC0C4',
    emoji: '●',
    label: 'Ocean Adventure',
  },
  dinosaur: {
    primary: '#3E8948',
    secondary: '#E4F3DC',
    accent: '#F7C04A',
    emoji: '▲',
    label: 'Dino Explorer',
  },
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

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
  star: {
    fontSize: 22,
    opacity: 0.22,
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
            Color in a {themeStyle.emoji === '★' ? 'star' : 'shape'} every time
            you earn it!
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
                  <Text style={[styles.star, { color: themeStyle.accent }]}>
                    {themeStyle.emoji}
                  </Text>
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
