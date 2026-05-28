import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useCanvasStore } from "@/stores/canvasStore";
import { COLORS, FONTS } from "@/lib/design";

type ProgressIndicatorProps = {
  style?: Record<string, unknown>;
};

/**
 * Coloring progress indicator — mobile port of coloring-ui's kids
 * ProgressIndicator: a star-filling circular ring (40px, r=18, 3px
 * stroke) with a ⭐/🌟 in the centre and a bold orange N% beside it.
 *
 * Web values matched exactly: grey #E5E7EB track, orange #FB8C00 fill
 * (gold #FDD835 when complete). Hidden at 0% like web. Sits in a soft
 * white pill so it stays legible floating over the canvas (the mobile
 * adaptation — web renders it inline in the toolbar).
 */

const SIZE = 40;
const RADIUS = 18;
const STROKE = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TRACK = "#E5E7EB";
const FILL = "#FB8C00";
const FILL_COMPLETE = "#FDD835";

const ProgressIndicator = ({ style }: ProgressIndicatorProps) => {
  const raw = useCanvasStore((s) => s.progress);
  const progress = Math.round(raw);

  if (progress === 0) return null;

  const isComplete = progress >= 100;
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.ringWrap}>
        {/* -90° rotation so the ring fills from the top, like web. */}
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={TRACK}
            strokeWidth={STROKE}
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isComplete ? FILL_COMPLETE : FILL}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </Svg>
        <Text style={styles.star}>{isComplete ? "🌟" : "⭐"}</Text>
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
    transform: [{ rotate: "-90deg" }],
  },
  star: {
    fontSize: 14,
  },
  progressText: {
    fontSize: 16,
    color: COLORS.crayonOrange,
    fontFamily: FONTS.bold,
  },
});

export default ProgressIndicator;
