import { useState, memo, useCallback } from "react";
import {
  Text,
  View,
  Dimensions,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
  ListRenderItem,
} from "react-native";
import { SvgUri } from "react-native-svg";
import { useRouter } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStar,
  faPalette,
  faCalendarWeek,
  faTrophy,
  faWandMagicSparkles,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useFeed } from "@/hooks/api";
import Loading from "@/components/Loading/Loading";
import { perfect } from "@/styles";
import type {
  FeedColoringImage,
  FeedSavedArtwork,
  ChallengeWithProgress,
} from "@/api";

const COLORS = {
  textMuted: "#8B7E78",
  textPrimary: "#374151",
  white: "#FFFFFF",
  crayonOrange: "#E46444",
  secondaryOrange: "#F1AE7E",
};

const outerPadding = 20;
const gridGap = 12;

// Card size for horizontal lists
const getCardSize = (screenWidth: number) => {
  // Show ~2.5 cards so user knows to scroll
  return (screenWidth - outerPadding * 2 - gridGap) / 2.3;
};

// Memoized coloring image card
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
      onPress={onPress}
    >
      <View style={styles.cardInner}>
        {item.svgUrl ? (
          <SvgUri
            width="100%"
            height="100%"
            uri={item.svgUrl}
            viewBox="0 0 1024 1024"
          />
        ) : (
          <Text style={styles.placeholderText}>🎨</Text>
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
      onPress={onPress}
    >
      <View style={styles.cardInner}>
        {item.thumbnailUrl || item.imageUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl || item.imageUrl }}
            style={styles.artworkImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.placeholderText}>🖼️</Text>
        )}
      </View>
    </Pressable>
  ),
);

ArtworkCard.displayName = "ArtworkCard";

// Section header component
const SectionHeader = ({
  title,
  icon,
}: {
  title: string;
  icon: IconDefinition;
}) => (
  <View style={styles.sectionHeader}>
    <FontAwesomeIcon
      icon={icon}
      size={20}
      color={COLORS.crayonOrange}
      secondaryColor={COLORS.secondaryOrange}
      secondaryOpacity={1}
    />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// Horizontal scrolling section for coloring images
const HorizontalSection = ({
  title,
  icon,
  items,
  cardSize,
}: {
  title: string;
  icon: IconDefinition;
  items: FeedColoringImage[];
  cardSize: number;
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
      <SectionHeader title={title} icon={icon} />
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
      <SectionHeader title="Your Art" icon={faPalette} />
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

  return (
    <Pressable
      style={styles.section}
      onPress={() => router.push("/challenges")}
    >
      <SectionHeader title="Challenge" icon={faTrophy} />
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
            <Text style={styles.claimBadgeText}>Claim!</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const Feed = () => {
  const [screenWidth] = useState(Dimensions.get("window").width);
  const cardSize = getCardSize(screenWidth);

  const { data, isLoading, isError, refetch } = useFeed();

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Oops! Something went wrong loading your feed.
        </Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const { todaysPick, activeChallenge, recentArt, myCreations, moreToColor } =
    data;

  // Check if we have any content to show
  const hasContent =
    todaysPick ||
    activeChallenge ||
    recentArt.length > 0 ||
    myCreations.length > 0 ||
    moreToColor.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No coloring pages available right now. Check back soon!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Today's Pick */}
      {todaysPick && (
        <HorizontalSection
          title="Today"
          icon={faStar}
          items={[todaysPick]}
          cardSize={cardSize}
        />
      )}

      {/* Active Challenge */}
      {activeChallenge && <ChallengeSection challenge={activeChallenge} />}

      {/* User's saved artworks */}
      <RecentArtSection artworks={recentArt} cardSize={cardSize} />

      {/* User's generated coloring pages */}
      <HorizontalSection
        title="My Creations"
        icon={faWandMagicSparkles}
        items={myCreations}
        cardSize={cardSize}
      />

      {/* More to Color - Past daily images */}
      <HorizontalSection
        title="More to Color"
        icon={faCalendarWeek}
        items={moreToColor}
        cardSize={cardSize}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: outerPadding,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
    color: COLORS.textPrimary,
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
  placeholderText: {
    fontSize: 40,
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
    color: COLORS.textMuted,
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
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  challengeProgress: {
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: COLORS.textMuted,
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
});

export default Feed;
