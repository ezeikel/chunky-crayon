import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const PALETTE = {
  ink: "#0f172a",
  muted: "#64748b",
  accent: "#f59e0b",
  border: "#e2e8f0",
  slotBg: "#fffbeb",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 28,
    textAlign: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: PALETTE.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  slot: {
    width: 84,
    height: 84,
    margin: 7,
    borderWidth: 2,
    borderColor: PALETTE.border,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: PALETTE.slotBg,
    alignItems: "center",
    justifyContent: "center",
  },
  slotNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: PALETTE.muted,
  },
  rewardBox: {
    marginTop: 32,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    textAlign: "center",
  },
  rewardLabel: {
    fontSize: 11,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: "bold",
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

type Props = {
  goal: string;
  childName: string;
  slots: number;
  reward: string;
  qrDataUrl: string;
  rewardEmojiDataUrl: string | null;
};

export const StickerChartDocument = ({
  goal,
  childName,
  slots,
  reward,
  qrDataUrl,
  rewardEmojiDataUrl,
}: Props) => {
  const subtitle = childName ? `${childName}'s sticker chart` : "Sticker chart";

  return (
    <Document title={`${goal} | Sticker Chart`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{goal || "My sticker chart"}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: slots }, (_, index) => (
            <View key={index} style={styles.slot}>
              <Text style={styles.slotNumber}>{index + 1}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>When the chart is full</Text>
          <Text style={styles.rewardText}>{reward || "Pick a reward"}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Built free at stickerchartmaker.com
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
          Chart full, goal smashed. Time for a reward: a free coloring page from
          Chunky Crayon. Scan the code to pick yours.
        </Text>
        <Image src={qrDataUrl} style={styles.qr} />
        <Text style={styles.rewardLink}>chunkycrayon.com</Text>
        <Text style={styles.rewardFootnote}>
          Built free at stickerchartmaker.com. From the makers of Chunky Crayon.
        </Text>
      </Page>
    </Document>
  );
};
