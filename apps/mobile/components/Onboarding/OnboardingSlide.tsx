import { ReactNode } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type OnboardingSlideProps = {
  title: string;
  description: string;
  renderVisual: () => ReactNode;
};

const OnboardingSlide = ({
  title,
  description,
  renderVisual,
}: OnboardingSlideProps) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.visualArea}>
        {renderVisual()}
      </Animated.View>
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        style={styles.textArea}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  visualArea: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  textArea: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 28,
    color: "#374151",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 17,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 8,
  },
});

export default OnboardingSlide;
