import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { GameDef } from "../../components/RoadKit/types";

const PALETTE = {
  ink: "#0f172a",
  muted: "#64748b",
  accent: "#0ea5e9",
  border: "#e2e8f0",
  cardBg: "#f0f9ff",
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    backgroundColor: "#ffffff",
  },
  // Cover page
  cover: {
    padding: 48,
    fontFamily: "Helvetica",
    color: PALETTE.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  coverKicker: {
    fontSize: 12,
    color: PALETTE.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "bold",
    marginBottom: 14,
  },
  coverTitle: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    maxWidth: 420,
  },
  coverSubtitle: {
    fontSize: 15,
    color: PALETTE.muted,
    textAlign: "center",
    marginBottom: 28,
  },
  coverListBox: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: PALETTE.cardBg,
    padding: 20,
    width: 360,
  },
  coverListLabel: {
    fontSize: 10,
    color: PALETTE.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  coverListRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  coverListNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: PALETTE.accent,
    marginRight: 8,
  },
  coverListText: {
    fontSize: 11,
    flex: 1,
  },
  // Game page
  gameHeader: {
    marginBottom: 18,
  },
  gameKicker: {
    fontSize: 10,
    color: PALETTE.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gameBlurb: {
    fontSize: 12,
    color: PALETTE.muted,
  },
  // Bingo grid
  bingoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bingoCell: {
    width: "25%",
    height: 92,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bingoCellText: {
    fontSize: 10,
    textAlign: "center",
  },
  // Checklist + tally rows
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  checkBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.muted,
    borderRadius: 3,
    marginRight: 10,
    marginTop: 1,
  },
  checkText: {
    fontSize: 13,
    flex: 1,
  },
  tallyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    paddingBottom: 6,
  },
  tallyText: {
    fontSize: 13,
    flex: 1,
  },
  tallyBox: {
    width: 90,
    height: 22,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 4,
  },
  // Numbered list
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  listNumber: {
    fontSize: 13,
    fontWeight: "bold",
    color: PALETTE.accent,
    marginRight: 8,
  },
  listText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 1.4,
  },
  // Doodle page
  doodleBox: {
    flex: 1,
    borderWidth: 2,
    borderColor: PALETTE.border,
    borderStyle: "dashed",
    borderRadius: 16,
    marginTop: 8,
  },
  doodleHint: {
    fontSize: 12,
    color: PALETTE.muted,
    textAlign: "center",
    marginTop: 14,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 9,
    color: PALETTE.muted,
  },
  // Reward page
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
  tripLabel: string;
  ageLabel: string;
  games: GameDef[];
  qrDataUrl: string;
  rewardEmojiDataUrl: string | null;
};

const GamePageBody = ({ game }: { game: GameDef }) => {
  if (game.kind === "bingo") {
    // Pad to a multiple of 4 so the grid stays rectangular.
    const cells = game.items.slice(0, 25);
    const padded =
      cells.length % 4 === 0
        ? cells
        : [...cells, ...Array(4 - (cells.length % 4)).fill("")];
    return (
      <View style={styles.bingoGrid}>
        {padded.map((item, index) => (
          <View key={index} style={styles.bingoCell}>
            <Text style={styles.bingoCellText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (game.kind === "checklist") {
    return (
      <View>
        {game.items.map((item, index) => (
          <View key={index} style={styles.checkRow}>
            <View style={styles.checkBox} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (game.kind === "tally") {
    return (
      <View>
        {game.items.map((item, index) => (
          <View key={index} style={styles.tallyRow}>
            <Text style={styles.tallyText}>{item}</Text>
            <View style={styles.tallyBox} />
          </View>
        ))}
      </View>
    );
  }

  if (game.kind === "list") {
    return (
      <View>
        {game.items.map((item, index) => (
          <View key={index} style={styles.listRow}>
            <Text style={styles.listNumber}>{index + 1}.</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  // doodle
  return (
    <>
      <View style={styles.doodleBox} />
      <Text style={styles.doodleHint}>
        Color it in, doodle anything you want, or play tic tac toe with whoever
        is next to you.
      </Text>
    </>
  );
};

export const RoadKitDocument = ({
  tripLabel,
  ageLabel,
  games,
  qrDataUrl,
  rewardEmojiDataUrl,
}: Props) => {
  return (
    <Document title={`${tripLabel} Activity Pack | Kids Road Kit`}>
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverKicker}>Kids Road Kit</Text>
        <Text style={styles.coverTitle}>{tripLabel} Activity Pack</Text>
        <Text style={styles.coverSubtitle}>
          Ages {ageLabel}. {games.length}{" "}
          {games.length === 1 ? "page" : "pages"} to keep the drive calm.
        </Text>
        <View style={styles.coverListBox}>
          <Text style={styles.coverListLabel}>What is inside</Text>
          {games.map((game, index) => (
            <View key={game.key} style={styles.coverListRow}>
              <Text style={styles.coverListNumber}>{index + 1}.</Text>
              <Text style={styles.coverListText}>{game.title}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer} fixed>
          Built free at kidsroadkit.com
        </Text>
      </Page>

      {games.map((game) => (
        <Page key={game.key} size="A4" style={styles.page}>
          <View style={styles.gameHeader}>
            <Text style={styles.gameKicker}>Road trip game</Text>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameBlurb}>{game.blurb}</Text>
          </View>
          <GamePageBody game={game} />
          <Text style={styles.footer} fixed>
            Built free at kidsroadkit.com
          </Text>
        </Page>
      ))}

      <Page size="A4" style={styles.rewardPage}>
        <View style={styles.rewardTitleRow}>
          <Text style={styles.rewardTitle}>Great job!</Text>
          {rewardEmojiDataUrl && (
            <Image src={rewardEmojiDataUrl} style={styles.rewardEmoji} />
          )}
        </View>
        <Text style={styles.rewardSubtitle}>
          Made it through the long stretch. For the next leg of the trip, grab
          more free coloring pages from Chunky Crayon. Scan the code to pick
          some.
        </Text>
        <Image src={qrDataUrl} style={styles.qr} />
        <Text style={styles.rewardLink}>chunkycrayon.com</Text>
        <Text style={styles.rewardFootnote}>
          Built free at kidsroadkit.com. From the makers of Chunky Crayon.
        </Text>
      </Page>
    </Document>
  );
};
