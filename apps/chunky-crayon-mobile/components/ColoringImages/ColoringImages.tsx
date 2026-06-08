import { useCallback, useEffect, useState, useMemo, memo } from "react";
import {
  Text,
  View,
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  ViewStyle,
} from "react-native";
import SafeSvgUri from "@/components/SafeSvgUri/SafeSvgUri";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import useColoringImages from "@/hooks/api/useColoringImages";
import Loading from "@/components/Loading/Loading";
import { COLORS } from "@/lib/design";
import { perfect } from "@/styles";
import Spinner from "../Spinner/Spinner";

// Memoized Square component to prevent unnecessary re-renders
const Square = memo(
  ({
    path,
    svgUri,
    style,
  }: {
    path: `/coloring-image/${string}`;
    svgUri: string;
    style?: ViewStyle;
  }) => (
    <View style={style}>
      <Link href={path} asChild>
        <Pressable style={squareStyles.pressable}>
          <View style={squareStyles.container}>
            <SafeSvgUri
              width="100%"
              height="100%"
              uri={svgUri}
              viewBox="0 0 1024 1024"
            />
          </View>
        </Pressable>
      </Link>
    </View>
  ),
);

Square.displayName = "Square";

// Hoisted to module scope so FlashList's ListFooterComponent identity is stable
// across renders — defining it inside ColoringImages remounted the footer (and
// its spinner) on every render.
const ListFooter = memo(
  ({
    isFetchingNextPage,
    hasNextPage,
    hasItems,
  }: {
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    hasItems: boolean;
  }) => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerContainer}>
          <Spinner color={COLORS.crayonOrange} size={24} />
        </View>
      );
    }

    if (!hasNextPage && hasItems) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.endMessage}>
            You've seen all the coloring pages!
          </Text>
        </View>
      );
    }

    return null;
  },
);

ListFooter.displayName = "ListFooter";

const squareStyles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    ...perfect.boxShadow,
  },
});

// Embedded-below-canvas mode (legacy iPad use): conservative columns keyed on
// the padded container width.
const getNumColumns = (width: number) => {
  if (width >= 768) {
    return 3; // iPad
  } else if (width >= 414) {
    return 2; // Large iPhone
  } else {
    return 1; // Small iPhone
  }
};

// Full-screen grid mode (category / browse-all screens): ALWAYS multi-column —
// 2 on a phone, 3 on iPad. Keyed on the full screen width, never the padded
// inner width (that collapses small phones to 1 column → the "one image" bug).
const getFullScreenColumns = (screenWidth: number) =>
  screenWidth >= 768 ? 3 : 2;

const getSquareSize = (
  width: number,
  padding: number,
  gridGap: number,
  numColumns: number,
) => {
  return (width - padding * 2 - gridGap * (numColumns - 1)) / numColumns;
};

const outerPadding = 20;
const innerPadding = 16;
const gridGap = 16;

type ColoringImagesProps = {
  /** Filter the library to a category slug (animals, vehicles, …). */
  category?: string;
  /** Filter by difficulty (beginner|intermediate|advanced|expert). */
  difficulty?: string;
  /**
   * Full-screen grid (a category / browse-all SCREEN owns the whole viewport)
   * vs the legacy embed BELOW the canvas. Full-screen = flex:1 + always
   * multi-column + a friendly empty state. Embed = the old minHeight:300,
   * padded-width columns, null-when-empty.
   */
  fullScreen?: boolean;
};

const ColoringImages = ({
  category,
  difficulty,
  fullScreen = false,
}: ColoringImagesProps = {}) => {
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useColoringImages(
    category || difficulty ? { category, difficulty } : undefined,
  );

  // Flatten all pages into a single array
  const coloringImages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.coloringImages);
  }, [data?.pages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenWidth(Dimensions.get("window").width);
    };

    const subscription = Dimensions.addEventListener(
      "change",
      updateDimensions,
    );
    return () => subscription?.remove();
  }, []);

  // Full-screen grids size columns off the FULL screen width (always 2/3,
  // never 1); the legacy embed uses the padded container width.
  const containerWidth = screenWidth - outerPadding * 2;
  const numColumns = fullScreen
    ? getFullScreenColumns(screenWidth)
    : getNumColumns(containerWidth);
  const squareSize = getSquareSize(
    containerWidth,
    innerPadding,
    gridGap,
    numColumns,
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!coloringImages || coloringImages.length === 0) {
    // Full-screen: a friendly empty state (never a blank/collapsed view).
    // Embed: stay invisible (the surrounding screen owns the layout).
    if (fullScreen) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No pages here yet — check back soon!
          </Text>
        </View>
      );
    }
    return null;
  }

  return (
    <View
      style={fullScreen ? styles.outerContainerFull : styles.outerContainer}
    >
      <View style={fullScreen ? styles.containerFull : styles.container}>
        <FlashList
          data={coloringImages}
          renderItem={({ item, index }) => {
            const isLastColumn = (index + 1) % numColumns === 0;

            return (
              <Square
                path={`/coloring-image/${item.id}`}
                svgUri={item.svgUrl as string}
                style={{
                  width: squareSize,
                  height: squareSize,
                  marginRight: isLastColumn ? 0 : gridGap,
                  marginBottom: gridGap,
                }}
              />
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              style={styles.refreshControl}
            >
              {refreshing ? <Spinner style={styles.spinner} /> : null}
            </RefreshControl>
          }
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={{
            padding: innerPadding,
          }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <ListFooter
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasItems={coloringImages.length > 0}
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: outerPadding,
  },
  container: {
    backgroundColor: "transparent",
    // FlashList needs explicit height or flex
    minHeight: 300,
  },
  // Full-screen grid: fill the viewport so FlashList virtualizes over the whole
  // screen (the embed's fixed 300pt box is what truncated category grids to one
  // visible row).
  outerContainerFull: {
    flex: 1,
    paddingHorizontal: outerPadding,
  },
  containerFull: {
    flex: 1,
    backgroundColor: "transparent",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: COLORS.textWarmMuted,
    textAlign: "center",
  },
  refreshControl: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    marginVertical: 16,
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  endMessage: {
    color: COLORS.textWarmMuted,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    textAlign: "center",
  },
});

export default ColoringImages;
