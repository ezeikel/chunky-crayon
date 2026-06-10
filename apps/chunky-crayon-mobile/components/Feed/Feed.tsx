import { memo, useCallback, type ReactNode } from "react";
import {
  Text,
  View,
  useWindowDimensions,
  Pressable,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from "react-native";
import { Image } from "expo-image";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { useRouter } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStar,
  faPalette,
  faPaintBrush,
  faCalendarWeek,
  faTrophy,
  faWandMagicSparkles,
  faImage,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useFeed } from "@/hooks/api";
import Loading from "@/components/Loading/Loading";
import SectionHeader, {
  type SectionTint,
} from "@/components/SectionHeader/SectionHeader";
import SeeAllButton from "@/components/SeeAllButton/SeeAllButton";
import { useT } from "@/lib/i18n/useT";
import { COLORS } from "@/lib/design";
import { tapLight } from "@/utils/haptics";
import { perfect } from "@/styles";
import type {
  FeedColoringImage,
  FeedSavedArtwork,
  FeedInProgressItem,
  ChallengeWithProgress,
} from "@/api";

const outerPadding = 20;
const gridGap = 12;
const TABLET_BREAKPOINT = 768;

// Card size for the horizontal feed lists. Device-aware so cards stay
// proportional to the category tiles (which also scale) — on a phone ~2.3
// across (a peek of the next), on iPad ~4.6 across so a Today/Continue card
// isn't half the screen.
const getCardSize = (screenWidth: number) => {
  const across = screenWidth >= TABLET_BREAKPOINT ? 4.6 : 2.3;
  return (screenWidth - outerPadding * 2 - gridGap * (across - 1)) / across;
};

// Memoized coloring image card - shows preview if user has progress
const ColoringCard = memo(
  ({
    item,
    size,
    onPress,
  }: {
    item: FeedColoringImage;
    size: number;
    onPress: () => void;
  }) => (
    <Pressable
      style={[styles.card, { width: size, height: size }]}
      onPress={() => {
        tapLight(); // light tap: navigation into a coloring page
        onPress();
      }}
    >
      <View style={styles.cardInner}>
        {item.previewUrl ? (
          // Show user's progress preview if available
          <Image
            source={{ uri: item.previewUrl }}
            style={styles.artworkImage}
            contentFit="cover"
            transition={200}
          />
        ) : item.svgUrl ? (
          // Fall back to SVG outline
          <SafeSvgUri width="100%" height="100%" uri={item.svgUrl} />
        ) : (
          <FontAwesomeIcon
            icon={faPalette}
            size={36}
            color={COLORS.secondaryOrange}
            secondaryColor={COLORS.bgCreamDark}
            secondaryOpacity={1}
          />
        )}
        {/* Show indicator when there's progress */}
        {item.previewUrl && (
          <View style={styles.progressIndicator}>
            <FontAwesomeIcon icon={faPalette} size={12} color={COLORS.white} />
          </View>
        )}
      </View>
    </Pressable>
  ),
);

ColoringCard.displayName = "ColoringCard";

// Memoized saved artwork card (user's colored art)
const ArtworkCard = memo(
  ({
    item,
    size,
    onPress,
  }: {
    item: FeedSavedArtwork;
    size: number;
    onPress: () => void;
  }) => (
    <Pressable
      style={[styles.card, { width: size, height: size }]}
      onPress={() => {
        tapLight(); // light tap: navigation into a coloring page
        onPress();
      }}
    >
      <View style={styles.cardInner}>
        {item.thumbnailUrl || item.imageUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl || item.imageUrl }}
            style={styles.artworkImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <FontAwesomeIcon
            icon={faImage}
            size={36}
            color={COLORS.lavender}
            secondaryColor={COLORS.bgCreamDark}
            secondaryOpacity={1}
          />
        )}
      </View>
    </Pressable>
  ),
);

ArtworkCard.displayName = "ArtworkCard";

// Memoized in-progress card (shows preview or falls back to SVG)
const InProgressCard = memo(
  ({
    item,
    size,
    onPress,
  }: {
    item: FeedInProgressItem;
    size: number;
    onPress: () => void;
  }) => (
    <Pressable
      style={[styles.card, { width: size, height: size }]}
      onPress={() => {
        tapLight(); // light tap: navigation into a coloring page
        onPress();
      }}
    >
      <View style={styles.cardInner}>
        {item.previewUrl ? (
          <Image
            source={{ uri: item.previewUrl }}
            style={styles.artworkImage}
            contentFit="cover"
            transition={200}
          />
        ) : item.coloringImage.svgUrl ? (
          <SafeSvgUri
            width="100%"
            height="100%"
            uri={item.coloringImage.svgUrl}
          />
        ) : (
          <FontAwesomeIcon
            icon={faPalette}
            size={36}
            color={COLORS.secondaryOrange}
            secondaryColor={COLORS.bgCreamDark}
            secondaryOpacity={1}
          />
        )}
        {/* Palette overlay to indicate resumable coloring */}
        <View style={styles.progressOverlay}>
          <FontAwesomeIcon icon={faPalette} size={12} color={COLORS.white} />
        </View>
      </View>
    </Pressable>
  ),
);

InProgressCard.displayName = "InProgressCard";

// Section header is the shared medallion component (one source of truth across
// every collection/browse surface). Feed pads its headers to outerPadding.
const FeedSectionHeader = ({
  title,
  icon,
  tint,
  right,
}: {
  title: string;
  icon: IconDefinition;
  tint?: SectionTint;
  // Optional "see all" affordance (the circular arrow) — only sections with a
  // deeper destination pass one; single-item sections (Today) leave it out.
  right?: ReactNode;
}) => (
  <SectionHeader
    title={title}
    icon={icon}
    tint={tint}
    right={right}
    style={styles.sectionHeader}
  />
);

// Horizontal scrolling section for coloring images
const HorizontalSection = ({
  title,
  icon,
  items,
  cardSize,
  tint,
  onSeeAll,
  seeAllLabel,
}: {
  title: string;
  icon: IconDefinition;
  items: FeedColoringImage[];
  cardSize: number;
  tint?: SectionTint;
  // When present, the header shows the circular "see all" arrow → onSeeAll.
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) => {
  const router = useRouter();

  const renderItem: ListRenderItem<FeedColoringImage> = useCallback(
    ({ item }) => (
      <View style={{ marginRight: gridGap }}>
        <ColoringCard
          item={item}
          size={cardSize}
          onPress={() => router.push(`/coloring-image/${item.id}`)}
        />
      </View>
    ),
    [cardSize, router],
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <FeedSectionHeader
        title={title}
        icon={icon}
        tint={tint}
        right={
          onSeeAll ? (
            <SeeAllButton onPress={onSeeAll} accessibilityLabel={seeAllLabel} />
          ) : undefined
        }
      />
      <View style={{ height: cardSize, width: "100%" }}>
        <FlatList
          data={items}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );
};

// In-progress coloring section (Continue Coloring)
const InProgressSection = ({
  items,
  cardSize,
}: {
  items: FeedInProgressItem[];
  cardSize: number;
}) => {
  const router = useRouter();
  const t = useT("mobile.feed");

  const renderItem: ListRenderItem<FeedInProgressItem> = useCallback(
    ({ item }) => (
      <View style={{ marginRight: gridGap }}>
        <InProgressCard
          item={item}
          size={cardSize}
          onPress={() =>
            router.push(`/coloring-image/${item.coloringImage.id}`)
          }
        />
      </View>
    ),
    [cardSize, router],
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <FeedSectionHeader
        title={t("continueColoring")}
        icon={faPaintBrush}
        tint="pink"
        right={
          <SeeAllButton
            onPress={() => router.push("/my-artwork")}
            accessibilityLabel={t("seeAllYourColoring")}
          />
        }
      />
      <View style={{ height: cardSize, width: "100%" }}>
        <FlatList
          data={items}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );
};

// User's saved artworks section
const RecentArtSection = ({
  artworks,
  cardSize,
}: {
  artworks: FeedSavedArtwork[];
  cardSize: number;
}) => {
  const router = useRouter();
  const t = useT("mobile.feed");

  const renderItem: ListRenderItem<FeedSavedArtwork> = useCallback(
    ({ item }) => (
      <View style={{ marginRight: gridGap }}>
        <ArtworkCard
          item={item}
          size={cardSize}
          onPress={() =>
            router.push(`/coloring-image/${item.coloringImage.id}`)
          }
        />
      </View>
    ),
    [cardSize, router],
  );

  if (artworks.length === 0) return null;

  return (
    <View style={styles.section}>
      <FeedSectionHeader
        title={t("yourArt")}
        icon={faPalette}
        tint="purple"
        right={
          <SeeAllButton
            onPress={() => router.push("/my-artwork")}
            accessibilityLabel={t("seeAllYourArt")}
          />
        }
      />
      <View style={{ height: cardSize, width: "100%" }}>
        <FlatList
          data={artworks}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );
};

// Challenge progress section
const ChallengeSection = ({
  challenge,
}: {
  challenge: ChallengeWithProgress;
}) => {
  const router = useRouter();
  const t = useT("mobile.feed");

  return (
    <Pressable
      style={styles.section}
      onPress={() => router.push("/challenges")}
    >
      <FeedSectionHeader title={t("challenge")} icon={faTrophy} tint="gold" />
      <View style={styles.challengeCard}>
        <View style={styles.challengeContent}>
          <Text style={styles.challengeIcon}>{challenge.challenge.icon}</Text>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle} numberOfLines={1}>
              {challenge.challenge.title}
            </Text>
            <Text style={styles.challengeProgress}>
              {challenge.progress} / {challenge.challenge.requirement}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(challenge.percentComplete, 100)}%` },
            ]}
          />
        </View>
        {challenge.isCompleted && !challenge.rewardClaimed && (
          <View style={styles.claimBadge}>
            <Text style={styles.claimBadgeText}>{t("claim")}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const Feed = () => {
  // useWindowDimensions so the card grid re-flows on iPad rotation.
  const { width: screenWidth } = useWindowDimensions();
  const cardSize = getCardSize(screenWidth);
  const router = useRouter();
  const t = useT("mobile.feed");
  const tButton = useT("mobile.button");

  const { data, isLoading, isError, refetch } = useFeed();

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t("errorLoading")}</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>{tButton("tryAgain")}</Text>
        </Pressable>
      </View>
    );
  }

  const {
    todaysPick,
    activeChallenge,
    inProgressWork,
    recentArt,
    myCreations,
    moreToColor,
  } = data;

  // Check if we have any content to show
  const hasContent =
    todaysPick ||
    activeChallenge ||
    inProgressWork.length > 0 ||
    recentArt.length > 0 ||
    myCreations.length > 0 ||
    moreToColor.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t("emptyNoPages")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Today's Pick */}
      {todaysPick && (
        <HorizontalSection
          title={t("today")}
          icon={faStar}
          items={[todaysPick]}
          cardSize={cardSize}
          tint="orange"
        />
      )}

      {/* Active Challenge */}
      {activeChallenge && <ChallengeSection challenge={activeChallenge} />}

      {/* Continue Coloring - In-progress work */}
      <InProgressSection items={inProgressWork} cardSize={cardSize} />

      {/* User's saved artworks */}
      <RecentArtSection artworks={recentArt} cardSize={cardSize} />

      {/* User's generated coloring pages — see all → My Art (their collection) */}
      <HorizontalSection
        title={t("yourCreations")}
        icon={faWandMagicSparkles}
        items={myCreations}
        cardSize={cardSize}
        tint="teal"
        onSeeAll={() => router.push("/my-artwork")}
        seeAllLabel={t("seeAllYourCreations")}
      />

      {/* More to Color - Past daily images — see all → the full library */}
      <HorizontalSection
        title={t("moreToColor")}
        icon={faCalendarWeek}
        items={moreToColor}
        cardSize={cardSize}
        tint="pink"
        onSeeAll={() => router.push("/category/all")}
        seeAllLabel={t("discoverMorePages")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  section: {
    marginTop: 24,
  },
  // Per-screen padding for the shared SectionHeader (Feed uses outerPadding).
  sectionHeader: {
    paddingHorizontal: outerPadding,
  },
  horizontalList: {
    paddingHorizontal: outerPadding,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    ...perfect.boxShadow,
  },
  cardInner: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "TondoTrial-Regular",
    color: COLORS.textWarmMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.crayonOrange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "TondoTrial-Regular",
    color: COLORS.textWarmMuted,
    textAlign: "center",
  },
  challengeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: outerPadding,
    ...perfect.boxShadow,
  },
  challengeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 32,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textGray,
    marginBottom: 2,
  },
  challengeProgress: {
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: COLORS.textWarmMuted,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.crayonOrange,
    borderRadius: 4,
  },
  claimBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.crayonOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimBadgeText: {
    fontSize: 12,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.white,
  },
  progressIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E46444", // crayon-orange
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  progressOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E46444", // crayon-orange
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default Feed;
