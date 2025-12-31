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
import { SvgUri } from "react-native-svg";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import useColoringImages from "@/hooks/api/useColoringImages";
import Loading from "@/components/Loading/Loading";
import { perfect } from "@/styles";
import Spinner from "../Spinner/Spinner";

const COLORS = {
  textMuted: "#8B7E78",
  white: "#FFFFFF",
  crayonOrange: "#E46444",
};

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
            <SvgUri
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

const getNumColumns = (width: number) => {
  if (width >= 768) {
    return 3; // iPad
  } else if (width >= 414) {
    return 2; // Large iPhone
  } else {
    return 1; // Small iPhone
  }
};

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

const ColoringImages = () => {
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
  } = useColoringImages();

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

  // Calculate sizes based on container width (screenWidth - outer padding)
  const containerWidth = screenWidth - outerPadding * 2;
  const numColumns = getNumColumns(containerWidth);
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
    return null;
  }

  const ListFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerContainer}>
          <Spinner color={COLORS.crayonOrange} size={24} />
        </View>
      );
    }

    if (!hasNextPage && coloringImages.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.endMessage}>
            You've seen all the coloring pages!
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
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
          ListFooterComponent={ListFooter}
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
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    textAlign: "center",
  },
});

export default ColoringImages;
