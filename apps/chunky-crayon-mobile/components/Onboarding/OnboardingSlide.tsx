import { ReactNode, useState, useEffect } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type OnboardingSlideProps = {
  title: string;
  description: string;
  renderVisual: () => ReactNode;
  /** Whether this slide is currently visible. Animations trigger on first activation. */
  isActive?: boolean;
};

const OnboardingSlide = ({
  title,
  description,
  renderVisual,
  isActive = true,
}: OnboardingSlideProps) => {
  const { width } = useWindowDimensions();
  // Once activated, stay mounted so animations don't replay on swipe back
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.visualArea}>
        {hasBeenActive && (
          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.visualInner}
          >
            {renderVisual()}
          </Animated.View>
        )}
      </View>
      {hasBeenActive && (
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={styles.textArea}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      )}
      {!hasBeenActive && (
        <View style={styles.textArea}>
          <Text style={[styles.title, { opacity: 0 }]}>{title}</Text>
          <Text style={[styles.description, { opacity: 0 }]}>
            {description}
          </Text>
        </View>
      )}
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
  visualInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
