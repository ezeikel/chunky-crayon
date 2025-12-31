import { useState, useEffect } from "react";
import { View, Text, Dimensions, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faWandMagicSparkles,
  faClock,
  faSparkles,
} from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import ColoringImages from "@/components/ColoringImages/ColoringImages";
import CreateColoringImageForm from "@/components/forms/CreateColoringImageForm/CreateColoringImageForm";
import ColoAvatar from "@/components/ColoAvatar";
import AppHeader from "@/components/AppHeader";
import { useColoContext } from "@/contexts";

const padding = 20;

const HomeScreen = () => {
  const [screenWidth] = useState(Dimensions.get("window").width);
  const { coloState, isLoading: coloLoading } = useColoContext();

  // Float animation for Colo Avatar (matches web's animate-float)
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse - creates smooth continuous back-and-forth
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <AppHeader
          credits={50}
          challengeProgress={40}
          stickerCount={8}
          profileName="Artist"
          coloStage={coloState.stage}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Colo Avatar & Greeting */}
          <View className="items-center pt-4">
            <Animated.View style={floatStyle}>
              <ColoAvatar
                coloState={coloState}
                size="lg"
                showProgress
                enableTapReactions
              />
            </Animated.View>
            {!coloLoading && (
              <Text style={styles.stageName}>{coloState.stageName}</Text>
            )}
            {/* Main greeting */}
            <View style={styles.greetingRow}>
              <FontAwesomeIcon
                icon={faSparkles}
                size={24}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
              <Text style={styles.greeting}>
                What do you want to color today?
              </Text>
              <FontAwesomeIcon
                icon={faSparkles}
                size={24}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
            </View>

            {/* Colo encouragement message */}
            {!coloLoading && coloState.progressToNext && (
              <Text style={styles.encouragement}>
                {coloState.stageName} wants to grow! Save{" "}
                {coloState.progressToNext.required -
                  coloState.progressToNext.current}{" "}
                more artworks to evolve! 🎨
              </Text>
            )}
            {!coloLoading && !coloState.progressToNext && (
              <Text style={styles.encouragement}>
                Your {coloState.stageName} is so proud of you! 🌟
              </Text>
            )}
          </View>

          {/* Create Magic Card */}
          <View
            style={[
              styles.card,
              {
                width: screenWidth - padding * 2,
                alignSelf: "center",
                marginTop: 24,
                gap: 20,
              },
            ]}
          >
            {/* Decorative blur circles */}
            <View style={styles.topRightBlur} />
            <View style={styles.bottomLeftBlur} />

            {/* Header with icon */}
            <View className="items-center z-10">
              <View className="flex-row items-center justify-center gap-2 mb-3">
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  size={24}
                  color="#E46444"
                  secondaryColor="#F1AE7E"
                  secondaryOpacity={1}
                />
                <Text style={styles.headerTitle}>Create Magic!</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Type, talk, or snap a photo!
              </Text>
            </View>

            {/* Time notice */}
            <View style={styles.timeNotice}>
              <FontAwesomeIcon
                icon={faClock}
                size={14}
                color="#E46444"
                secondaryColor="#F1AE7E"
                secondaryOpacity={1}
              />
              <Text style={styles.timeNoticeText}>
                Ready in about 30 seconds
              </Text>
            </View>

            {/* Form */}
            <View style={styles.zIndex}>
              <CreateColoringImageForm />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <ColoringImages />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  stageName: {
    color: "#E46444",
    fontSize: 14,
    marginTop: 8,
    fontFamily: "TondoTrial-Bold",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 22,
    color: "#374151",
    textAlign: "center",
    fontFamily: "TondoTrial-Bold",
    flexShrink: 1,
  },
  encouragement: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 4,
    fontFamily: "TondoTrial-Regular",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#FFF5EB",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  topRightBlur: {
    position: "absolute",
    top: -48,
    right: -48,
    width: 96,
    height: 96,
    backgroundColor: "rgba(255, 138, 101, 0.15)",
    borderRadius: 48,
  },
  bottomLeftBlur: {
    position: "absolute",
    bottom: -32,
    left: -32,
    width: 80,
    height: 80,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderRadius: 40,
  },
  zIndex: {
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "TondoTrial-Bold",
    color: "#E46444",
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "TondoTrial-Regular",
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
  },
  timeNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 12,
    zIndex: 10,
  },
  timeNoticeText: {
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    color: "#6B7280",
  },
});

export default HomeScreen;
