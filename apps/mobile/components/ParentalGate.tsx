import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faLock,
  faXmark,
  faCheck,
  faCalculator,
} from "@fortawesome/pro-solid-svg-icons";
import { useForm } from "@tanstack/react-form";

type ParentalGateProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
};

type MathProblem = {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
};

// UK Year 4 level multiplication problems (matching web version)
const MATH_PROBLEMS: MathProblem[] = [
  { num1: 7, num2: 8, operator: "×", answer: 56 },
  { num1: 9, num2: 6, operator: "×", answer: 54 },
  { num1: 8, num2: 7, operator: "×", answer: 56 },
  { num1: 6, num2: 9, operator: "×", answer: 54 },
  { num1: 8, num2: 9, operator: "×", answer: 72 },
  { num1: 7, num2: 6, operator: "×", answer: 42 },
  { num1: 9, num2: 7, operator: "×", answer: 63 },
  { num1: 6, num2: 8, operator: "×", answer: 48 },
  { num1: 12, num2: 7, operator: "×", answer: 84 },
  { num1: 11, num2: 8, operator: "×", answer: 88 },
];

const getRandomProblem = (): MathProblem => {
  return MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
};

const ParentalGate = ({
  visible,
  onClose,
  onSuccess,
  title = "Parent Verification",
  subtitle = "Please solve this math problem to continue",
}: ParentalGateProps) => {
  const [problem, setProblem] = useState<MathProblem>(getRandomProblem);
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Shake animation for wrong answers (matching web version)
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // TanStack Form
  const form = useForm({
    defaultValues: {
      answer: "",
    },
    onSubmit: ({ value }) => {
      const numAnswer = parseInt(value.answer, 10);
      if (numAnswer === problem.answer) {
        form.reset();
        setError(false);
        onSuccess();
      } else {
        setError(true);
        triggerShake();
        setProblem(getRandomProblem());
        form.reset();
        // Focus input after reset
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
  });

  const handleClose = useCallback(() => {
    form.reset();
    setError(false);
    setProblem(getRandomProblem());
    onClose();
  }, [form, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      form.reset();
      setError(false);
      setProblem(getRandomProblem());
    }
  }, [visible, form]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Animated.View
          style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* Close Button */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={handleClose}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color="#9CA3AF" />
          </Pressable>

          {/* Lock Icon */}
          <View style={styles.iconContainer}>
            <FontAwesomeIcon icon={faLock} size={32} color="#E46444" />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Math Problem */}
          <View style={styles.problemContainer}>
            <FontAwesomeIcon
              icon={faCalculator}
              size={20}
              color="#E46444"
              style={styles.calculatorIcon}
            />
            <Text style={styles.problemText}>
              {problem.num1} {problem.operator} {problem.num2} = ?
            </Text>
          </View>

          {/* Answer Input with TanStack Form */}
          <form.Field name="answer">
            {(field) => (
              <TextInput
                ref={inputRef}
                style={[styles.input, error && styles.inputError]}
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Enter answer"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => form.handleSubmit()}
                maxLength={3}
                autoFocus
              />
            )}
          </form.Field>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>
              Incorrect answer. Please try again.
            </Text>
          )}

          {/* Submit Button */}
          <form.Subscribe
            selector={(state) => ({
              answer: state.values.answer,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ answer, isSubmitting }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  !answer && styles.submitButtonDisabled,
                ]}
                onPress={() => form.handleSubmit()}
                disabled={!answer || isSubmitting}
              >
                <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Verify</Text>
              </Pressable>
            )}
          </form.Subscribe>

          {/* COPPA Notice */}
          <Text style={styles.notice}>
            This verification helps ensure only parents or guardians can access
            this feature.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  closeButtonPressed: {
    backgroundColor: "#E5E7EB",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 22,
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  problemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  calculatorIcon: {
    opacity: 0.8,
  },
  problemText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 28,
    color: "#374151",
  },
  input: {
    width: "100%",
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#EF4444",
    marginBottom: 8,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E46444",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    width: "100%",
  },
  submitButtonPressed: {
    backgroundColor: "#D35A3A",
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  submitButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  notice: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
});

export default ParentalGate;
