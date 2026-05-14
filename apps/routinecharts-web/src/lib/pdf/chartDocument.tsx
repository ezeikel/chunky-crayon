import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ChartConfig } from "../../components/ChartBuilder/types";

const PALETTE = {
  ink: "#0f172a",
  muted: "#64748b",
  accent: "#f97316",
  border: "#e2e8f0",
  rowBg: "#fafafa",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 32,
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: PALETTE.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: PALETTE.rowBg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  rowIconFallback: {
    width: 40,
    height: 40,
    marginRight: 16,
    textAlign: "center",
    lineHeight: 1.8,
  },
  rowLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
  },
  rowTime: {
    fontSize: 14,
    color: PALETTE.muted,
    width: 80,
    textAlign: "right",
  },
  rowCheckbox: {
    width: 24,
    height: 24,
    marginLeft: 16,
    borderWidth: 2,
    borderColor: PALETTE.border,
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 9,
    color: PALETTE.muted,
  },
  rewardPage: {
    padding: 48,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  rewardEmoji: {
    width: 40,
    height: 40,
    marginLeft: 12,
  },
  rewardSubtitle: {
    fontSize: 16,
    color: PALETTE.muted,
    marginBottom: 32,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 1.5,
  },
  qr: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  rewardLink: {
    fontSize: 14,
    color: PALETTE.accent,
    fontWeight: "bold",
  },
  rewardFootnote: {
    marginTop: 48,
    fontSize: 10,
    color: PALETTE.muted,
    textAlign: "center",
    maxWidth: 360,
  },
});

export type ResolvedRow = {
  id: string;
  label: string;
  time: string;
  iconDataUrl: string | null;
};

type Props = {
  title: string;
  childName: string;
  rows: ResolvedRow[];
  qrDataUrl: string;
  rewardEmojiDataUrl: string | null;
};

const renderRowIcon = (row: ResolvedRow) =>
  row.iconDataUrl ? (
    <Image src={row.iconDataUrl} style={styles.rowIcon} />
  ) : (
    <Text style={styles.rowIconFallback}>•</Text>
  );

export const ChartDocument = ({
  title,
  childName,
  rows,
  qrDataUrl,
  rewardEmojiDataUrl,
}: Props) => {
  const subtitle = childName ? `${childName}'s daily plan` : "Daily routine";

  return (
    <Document title={`${title} | Routine Chart`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {rows.map((row) => (
          <View key={row.id} style={styles.row} wrap={false}>
            {renderRowIcon(row)}
            <Text style={styles.rowLabel}>{row.label || "..."}</Text>
            <Text style={styles.rowTime}>{row.time}</Text>
            <View style={styles.rowCheckbox} />
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Built free at routinecharts.com
        </Text>
      </Page>

      <Page size="A4" style={styles.rewardPage}>
        <View style={styles.rewardTitleRow}>
          <Text style={styles.rewardTitle}>Great job!</Text>
          {rewardEmojiDataUrl && (
            <Image src={rewardEmojiDataUrl} style={styles.rewardEmoji} />
          )}
        </View>
        <Text style={styles.rewardSubtitle}>
          Routines done. Time for a reward: a free coloring page from Chunky
          Crayon. Scan the code to pick yours.
        </Text>
        <Image src={qrDataUrl} style={styles.qr} />
        <Text style={styles.rewardLink}>chunkycrayon.com</Text>
        <Text style={styles.rewardFootnote}>
          Built free at routinecharts.com. From the makers of Chunky Crayon.
        </Text>
      </Page>
    </Document>
  );
};
