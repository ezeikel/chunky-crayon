import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Dimensions,
  Pressable,
  RefreshControl,
} from "react-native";
import { SvgUri } from "react-native-svg";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import tw from "twrnc";
import useColoringImages from "@/hooks/api/useColoringImages";
import Loading from "@/components/Loading/Loading";
import { perfect } from "@/styles";
import Spinner from "../Spinner/Spinner";

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

const padding = 20;
const gridGap = 20;

const ColoringImages = () => {
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: { coloringImages } = {},
    isLoading,
    refetch,
  } = useColoringImages();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await refetch();

    setRefreshing(false);
  }, []);

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

  const numColumns = getNumColumns(screenWidth);
  const squareSize = getSquareSize(screenWidth, padding, gridGap, numColumns);

  if (isLoading) {
    return <Loading />;
  }

  if (!coloringImages) {
    return <Text>No data</Text>;
  }

  const Square = ({
    path,
    svgUri,
    style,
  }: {
    path: `/coloring-image/${string}`;
    svgUri: string;
    style?: Record<string, unknown>;
  }) => (
    <Link
      href={path}
      style={tw.style({
        ...style,
      })}
      asChild
    >
      <Pressable style={tw`flex-1`}>
        <View
          style={tw.style(
            `bg-white rounded-lg justify-center items-center flex-1`,
            {
              ...perfect.boxShadow,
            },
          )}
        >
          <SvgUri
            width="100%"
            height="100%"
            uri={svgUri}
            viewBox="0 0 1024 1024"
          />
        </View>
      </Pressable>
    </Link>
  );

  return (
    <FlashList
      data={coloringImages}
      renderItem={({ item, index }) => {
        const isLastColumn = (index + 1) % numColumns === 0;
        const isLastRow =
          Math.floor(index / numColumns) ===
          Math.floor((coloringImages.length - 1) / numColumns);

        return (
          <Square
            path={`/coloring-image/${item.id}`}
            svgUri={item.svgUrl as string}
            style={tw.style({
              width: squareSize,
              height: squareSize,
              marginRight: isLastColumn ? 0 : gridGap,
              marginBottom: isLastRow ? 0 : gridGap,
            })}
          />
        );
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="transparent" // Hides the default spinner
          style={tw`justify-center items-center`}
        >
          {refreshing ? <Spinner style={tw`my-4`} /> : null}
        </RefreshControl>
      }
      keyExtractor={(item) => item.id.toString()}
      numColumns={numColumns}
      estimatedItemSize={squareSize + padding}
      contentContainerStyle={{
        padding,
      }}
    />
  );
};

export default ColoringImages;
