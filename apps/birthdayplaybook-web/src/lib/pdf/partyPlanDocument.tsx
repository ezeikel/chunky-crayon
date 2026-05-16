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
  accent: "#ec4899",
  border: "#e2e8f0",
  cardBg: "#fdf2f8",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 24,
    textAlign: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  titleEmoji: {
    width: 26,
    height: 26,
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 13,
    color: PALETTE.muted,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 11,
    color: PALETTE.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  checkBox: {
    width: 11,
    height: 11,
    borderWidth: 1.5,
    borderColor: PALETTE.muted,
    borderRadius: 2,
    marginRight: 8,
    marginTop: 2,
  },
  checkText: {
    fontSize: 12,
    flex: 1,
  },
  inviteBox: {
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    backgroundColor: PALETTE.cardBg,
  },
  inviteText: {
    fontSize: 12,
    lineHeight: 1.6,
  },
  stationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  stationNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: PALETTE.accent,
    marginRight: 8,
  },
  stationText: {
    fontSize: 12,
    flex: 1,
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
  childName: string;
  age: number;
  themeLabel: string;
  partyLength: string;
  checklist: string[];
  invite: string;
  stations: string[];
  qrDataUrl: string;
  themeEmojiDataUrl: string | null;
  rewardEmojiDataUrl: string | null;
};

export const PartyPlanDocument = ({
  childName,
  age,
  themeLabel,
  partyLength,
  checklist,
  invite,
  stations,
  qrDataUrl,
  themeEmojiDataUrl,
  rewardEmojiDataUrl,
}: Props) => {
  const partyTitle = childName
    ? `${childName}'s ${themeLabel} Party`
    : `${themeLabel} Party`;

  return (
    <Document title={`${partyTitle} | Birthday Playbook`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{partyTitle}</Text>
            {themeEmojiDataUrl && (
              <Image src={themeEmojiDataUrl} style={styles.titleEmoji} />
            )}
          </View>
          <Text style={styles.subtitle}>
            Turning {age}, {partyLength} party
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Party checklist</Text>
          {checklist.map((item, index) => (
            <View key={index} style={styles.checkRow}>
              <View style={styles.checkBox} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Invite wording</Text>
          <View style={styles.inviteBox}>
            <Text style={styles.inviteText}>{invite}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity stations</Text>
          {stations.map((station, index) => (
            <View key={index} style={styles.stationRow}>
              <Text style={styles.stationNumber}>{index + 1}.</Text>
              <Text style={styles.stationText}>{station}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Built free at birthdayplaybook.com
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
          Want an easy party activity station: free themed coloring sheets from
          Chunky Crayon. Scan the code to print a set for the big day.
        </Text>
        <Image src={qrDataUrl} style={styles.qr} />
        <Text style={styles.rewardLink}>chunkycrayon.com</Text>
        <Text style={styles.rewardFootnote}>
          Built free at birthdayplaybook.com. From the makers of Chunky Crayon.
        </Text>
      </Page>
    </Document>
  );
};
