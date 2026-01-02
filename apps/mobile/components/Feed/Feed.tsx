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
  faCalendarAlt,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useFeed } from "@/hooks/api";
import Loading from "@/components/Loading/Loading";
import { perfect } from "@/styles";
import type { FeedColoringImage, FeedSavedArtwork } from "@/api";

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

  const { todaysPick, recentArt, weeklyCollection, monthlyFeatured } = data;

  // Check if we have any content to show
  const hasContent =
    todaysPick ||
    recentArt.length > 0 ||
    weeklyCollection.length > 0 ||
    monthlyFeatured.length > 0;

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
      {/* Today's Pick as horizontal section */}
      {todaysPick && (
        <HorizontalSection
          title="Today's Pick"
          icon={faStar}
          items={[todaysPick]}
          cardSize={cardSize}
        />
      )}

      {/* Recent Art (User's saved artworks) */}
      <RecentArtSection artworks={recentArt} cardSize={cardSize} />

      {/* Weekly Collection */}
      <HorizontalSection
        title="This Week"
        icon={faCalendarWeek}
        items={weeklyCollection}
        cardSize={cardSize}
      />

      {/* Monthly Featured */}
      <HorizontalSection
        title="Featured"
        icon={faCalendarAlt}
        items={monthlyFeatured}
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
});

export default Feed;
