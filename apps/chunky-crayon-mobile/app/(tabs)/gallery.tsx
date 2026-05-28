import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AppHeader from "@/components/AppHeader";
import Feed from "@/components/Feed/Feed";
import useHeaderData from "@/hooks/useHeaderData";
import { COLORS, FONTS } from "@/lib/design";

/**
 * Gallery tab — the browse surface. Hosts the Feed (today's pick, active
 * challenge, in-progress work, recent art, my creations, more to color).
 *
 * Web keeps the logged-in home minimal (greeting + create + recent
 * creations) and puts browse content on separate routes; mobile mirrors
 * that split by moving the Feed here off the Home tab.
 */
const GalleryScreen = () => {
  const headerData = useHeaderData();

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <AppHeader
          credits={headerData.credits}
          challengeProgress={headerData.challengeProgress}
          stickerCount={headerData.stickerCount}
          profileName={headerData.profileName}
          coloStage={headerData.coloStage}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.headerSubtitle}>
              Pick something fun to color
            </Text>
          </View>
          <Feed />
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default GalleryScreen;
