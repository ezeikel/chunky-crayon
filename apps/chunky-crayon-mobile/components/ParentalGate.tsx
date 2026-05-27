import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHandWave } from "@fortawesome/pro-duotone-svg-icons";
import { FONTS, COLORS } from "@/lib/design";

/**
 * Mobile port of apps/chunky-crayon-web/components/ParentalGate/ParentalGateModal.tsx.
 *
 * The previous mobile gate shipped the old web design (Year-4
 * multiplication via text input + lock icon + COPPA notice). Web
 * replaced that months ago — Year-4 maths failed 95% of adults under
 * pressure and the lock icon read as "you are blocked" rather than
 * "oh hi grown-up". This file mirrors the new design value-for-value
 * so CC mobile + CC web parental gates look and behave identically.
 *
 * Behaviour parity:
 *   - One primary-school sum (a + b = ?), problem set matches web's
 *     PROBLEMS array.
 *   - Three chunky circular brand-orange answer buttons (correct +
 *     two close distractors via buildAnswerChoices).
 *   - Wrong answer ⇒ shake (Animated horizontal -10/+10 sequence) +
 *     reshuffle button positions so "always tap the middle one" fails.
 *   - 3 wrongs in a row ⇒ silent close (no scary "you failed"; kid
 *     gives up, parent re-triggers).
 *   - Friendly waving-hand icon (faHandWave duotone, orange/yellow,
 *     subtle wiggle on mount) — replaces the old lock.
 *
 * API parity with the previous mobile file is preserved so call sites
 * (settings.tsx, ActionModal, CreditPackModal) don't change:
 *   visible, onClose, onSuccess, title?, subtitle?
 *
 * Apple guideline 1.3 only requires a meaningful adult action — it
 * does NOT require Year-4 multiplication. Sago Mini / Toca Boca /
 * PBS Kids all ship simpler gates; we now match.
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

// Verbatim from web's ParentalGateModal.tsx — same problem set so
// parity holds.
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
 * Build a 3-button answer set: correct answer plus two close
 * distractors (±1). Same shape as web's buildAnswerChoices.
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

  // Container shake on wrong answer — Animated translation sequence.
  // Native driver so it doesn't fight the React thread when the kid is
  // mashing buttons.
  const shakeAnim = useRef(new Animated.Value(0)).current;
  // Wave hand wiggle when modal opens — single rotation pulse so the
  // header reads as "oh hi grown-up". Web does this via a CSS keyframe
  // (`animate-wave` + origin-bottom-right); RN gets it via Animated.
  const waveAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // Roll a fresh problem each time the modal opens; reset wrong count
  // and play the wave wiggle. Mirrors web's `useEffect([open])` reset.
  useEffect(() => {
    if (!visible) return;
    const next = pickRandomProblem();
    setProblem(next);
    setChoices(buildAnswerChoices(next.answer, true));
    setWrongCount(0);
    // 0 → 1 → 0 → 1 → 0 mini-wiggle. Same energy as the web wave but
    // simpler — Animated.sequence is enough; no need for Reanimated.
    waveAnim.setValue(0);
    Animated.sequence([
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(waveAnim, {
        toValue: -0.7,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(waveAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(waveAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, waveAnim]);

  const handleCorrect = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  const handleWrong = useCallback(() => {
    const next = wrongCount + 1;
    setWrongCount(next);
    triggerShake();
    setChoices((prev) => shuffle(prev));

    if (next >= MAX_WRONG_ATTEMPTS) {
      // Silent close — no "you failed" copy. Web does the same.
      setTimeout(() => onClose(), 450);
    }
  }, [wrongCount, triggerShake, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Prevent dismissing by tapping outside — kids will try.
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* Waving hand. faHandWave duotone — primary orange,
              secondary yellow at full opacity. Wiggles on mount via
              waveAnim. Replaces the lock icon. */}
          <Animated.View
            style={{
              transform: [
                {
                  rotate: waveAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ["-20deg", "20deg"],
                  }),
                },
              ],
            }}
          >
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

          {/* The sum. Soft cream pill matches the wizard's tile
              styling on web (bg-paper-cream / rounded-2xl). */}
          <View style={styles.sumPill} accessibilityLiveRegion="polite">
            <Text style={styles.sumText}>
              {problem.a} + {problem.b} = ?
            </Text>
          </View>

          {/* Three chunky circular answer buttons. Same vocabulary as
              the wizard's Dice / Next / Create — brand-orange fill,
              white text, active:scale-95. */}
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

          {/* Helper hint at the bottom — web shows a single small line
              of warm reassurance text. No bottom cancel button (web
              omits it too); modal swipes / back gesture / `onRequestClose`
              are the dismiss affordance. */}
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
    // Chunky bottom-drop shadow in the dark-orange shade — mirrors
    // web's [--bottom:] chunky shadow on primary buttons.
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
