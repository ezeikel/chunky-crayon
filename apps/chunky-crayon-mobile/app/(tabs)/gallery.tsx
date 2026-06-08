import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faShapes, faImages } from "@fortawesome/pro-duotone-svg-icons";
import AppHeader from "@/components/AppHeader";
import ParentalGate from "@/components/ParentalGate";
import Feed from "@/components/Feed/Feed";
import CategoryRow from "@/components/CategoryRow/CategoryRow";
import SectionHeader from "@/components/SectionHeader/SectionHeader";
import useHeaderData from "@/hooks/useHeaderData";
import { tapMedium } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";
import { perfect } from "@/styles";

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
  const t = useT("mobile.gallery");
  // "For Grown-ups" door → parent gate → settings. Present on every tab so a
  // parent can reach Settings from anywhere (gate keeps kids out).
  const [isSettingsGateOpen, setIsSettingsGateOpen] = useState(false);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <AppHeader
          credits={headerData.credits}
          profileName={headerData.profileName}
          avatarId={headerData.avatarId}
          onSettingsPress={() => setIsSettingsGateOpen(true)}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("title")}</Text>
            <Text style={styles.headerSubtitle}>{t("subtitle")}</Text>
          </View>

          {/* Library: browse by category (pills) — top of the surface, the
              Coupang/Prime-kids pattern. "See all" → the full category grid;
              "Browse all pages" → the full library grid. */}
          <SectionHeader
            title="Browse by category"
            icon={faShapes}
            tint="purple"
            style={styles.sectionHeader}
            right={
              <Pressable
                onPress={() => {
                  tapMedium();
                  router.push("/categories");
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all categories"
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            }
          />
          <CategoryRow />

          <Pressable
            style={styles.browseAll}
            onPress={() => {
              tapMedium();
              track(ANALYTICS_EVENTS.BROWSE_ALL_OPENED);
              router.push("/category/all");
            }}
            accessibilityRole="button"
            accessibilityLabel="Browse all coloring pages"
          >
            <FontAwesomeIcon
              icon={faImages}
              size={18}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.secondaryOrange}
              secondaryOpacity={1}
            />
            <Text style={styles.browseAllText}>Browse all pages</Text>
          </Pressable>

          <Feed />
        </ScrollView>
      </LinearGradient>

      {/* Settings is parent-gated: the door opens this gate, success routes to
          the settings stack. Same wiring as Home. */}
      <ParentalGate
        visible={isSettingsGateOpen}
        onClose={() => setIsSettingsGateOpen(false)}
        onSuccess={() => {
          setIsSettingsGateOpen(false);
          router.push("/settings");
        }}
      />
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
    paddingBottom: 128,
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
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  seeAll: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.crayonOrange,
  },
  browseAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    ...perfect.boxShadow,
  },
  browseAllText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

export default GalleryScreen;
