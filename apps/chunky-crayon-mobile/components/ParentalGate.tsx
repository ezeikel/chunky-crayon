import { useState, useCallback, useEffect } from "react";
import { View, Text, Modal, StyleSheet, Pressable } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHandWave } from "@fortawesome/pro-duotone-svg-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Mobile port of apps/chunky-crayon-web/components/ParentalGate/ParentalGateModal.tsx.
 *
 * Animations are Reanimated (worklets / UI thread) — never RN's
 * built-in Animated API. See feedback_use_reanimated_not_animated.
 *
 * Behaviour parity with web:
 *   - One primary-school sum (a + b = ?), problem set matches web's
 *     PROBLEMS array verbatim.
 *   - Three chunky circular brand-orange answer buttons (correct +
 *     two close distractors via buildAnswerChoices).
 *   - Wrong answer ⇒ shake (horizontal Reanimated sequence) +
 *     reshuffle button positions so "always tap the middle one" fails.
 *   - 3 wrongs in a row ⇒ silent close (no scary "you failed").
 *   - Friendly waving-hand icon (faHandWave duotone, orange/yellow)
 *     with a Reanimated wiggle on open. Replaces the old lock.
 *
 * API parity (so settings.tsx / ActionModal / TopUpPackModal don't
 * change): visible, onClose, onSuccess, title?, subtitle?
 *
 * Apple guideline 1.3 only requires a meaningful adult action; this
 * matches Sago Mini / Toca Boca / PBS Kids gate complexity.
 */

type ParentalGateProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
};

type Problem = {
  a: number;
  b: number;
  answer: number;
};

// Verbatim from web's ParentalGateModal.tsx.
const PROBLEMS: Problem[] = [
  { a: 2, b: 1, answer: 3 },
  { a: 1, b: 3, answer: 4 },
  { a: 3, b: 2, answer: 5 },
  { a: 4, b: 2, answer: 6 },
  { a: 2, b: 5, answer: 7 },
  { a: 3, b: 4, answer: 7 },
  { a: 5, b: 1, answer: 6 },
  { a: 1, b: 4, answer: 5 },
];

const pickRandomProblem = (): Problem =>
  PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * 3-button answer set: correct + two close distractors (±1).
 * Matches web's buildAnswerChoices.
 */
const buildAnswerChoices = (correct: number, shouldShuffle: boolean) => {
  const candidates = new Set<number>([correct]);
  let bump = 1;
  while (candidates.size < 3) {
    if (correct - bump > 0) candidates.add(correct - bump);
    if (candidates.size < 3) candidates.add(correct + bump);
    bump += 1;
  }
  const arr = [...candidates];
  return shouldShuffle ? shuffle(arr) : arr;
};

const MAX_WRONG_ATTEMPTS = 3;
const DEFAULT_PROBLEM = PROBLEMS[0];

const ParentalGate = ({
  visible,
  onClose,
  onSuccess,
  title = "Quick check",
  subtitle = "Tap the right answer to keep going.",
}: ParentalGateProps) => {
  const [problem, setProblem] = useState<Problem>(DEFAULT_PROBLEM);
  const [choices, setChoices] = useState<number[]>(() =>
    buildAnswerChoices(DEFAULT_PROBLEM.answer, false),
  );
  const [wrongCount, setWrongCount] = useState(0);

  // Reanimated shared values run on the UI thread via worklets —
  // animations don't block JS even when the kid is mashing buttons.
  const shakeX = useSharedValue(0);
  const waveRotation = useSharedValue(0); // -1..1 → -20deg..20deg

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveRotation.value * 20}deg` }],
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [shakeX]);

  // Roll a fresh problem each open, play the wave wiggle, reset state.
  useEffect(() => {
    if (!visible) return;
    const next = pickRandomProblem();
    setProblem(next);
    setChoices(buildAnswerChoices(next.answer, true));
    setWrongCount(0);

    // Wiggle: 0 → 1 → -0.7 → 0.8 → 0, mirrors the web `animate-wave`
    // keyframe. Using withSequence + ease-out cubic for a wave-like
    // settle (rotates around the wrist, peaks then dampens).
    waveRotation.value = 0;
    waveRotation.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(-0.7, { duration: 220 }),
      withTiming(0.8, { duration: 200 }),
      withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }),
    );
  }, [visible, waveRotation]);

  const handleCorrect = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  const handleWrong = useCallback(() => {
    const next = wrongCount + 1;
    setWrongCount(next);
    triggerShake();
    setChoices((prev) => shuffle(prev));

    if (next >= MAX_WRONG_ATTEMPTS) {
      // Silent close — no "you failed" copy.
      setTimeout(() => onClose(), 450);
    }
  }, [wrongCount, triggerShake, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, containerStyle]}>
          {/* faHandWave duotone — primary orange, secondary yellow.
              Wiggles on mount via waveRotation. Replaces the lock. */}
          <Animated.View style={waveStyle}>
            <FontAwesomeIcon
              icon={faHandWave}
              size={56}
              color={COLORS.crayonOrange}
              secondaryColor={COLORS.yellow}
              secondaryOpacity={1}
            />
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* The sum. Soft cream pill matches web's bg-paper-cream. */}
          <View style={styles.sumPill} accessibilityLiveRegion="polite">
            <Text style={styles.sumText}>
              {problem.a} + {problem.b} = ?
            </Text>
          </View>

          {/* Three chunky circular answer buttons. */}
          <View style={styles.answersRow} accessibilityRole="radiogroup">
            {choices.map((n, idx) => (
              <Pressable
                key={`${n}-${idx}`}
                onPress={() =>
                  n === problem.answer ? handleCorrect() : handleWrong()
                }
                style={({ pressed }) => [
                  styles.answerButton,
                  pressed && styles.answerButtonPressed,
                ]}
                accessibilityLabel={String(n)}
                accessibilityRole="button"
              >
                <Text style={styles.answerText}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>
            Adults: tap the right answer to continue.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    gap: 14,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  sumPill: {
    backgroundColor: COLORS.bgPeach,
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  sumText: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.textPrimary,
  },
  answersRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 4,
  },
  answerButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.crayonOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  answerButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.92,
  },
  answerText: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: "#FFFFFF",
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textWarmMuted,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },
});

export default ParentalGate;
