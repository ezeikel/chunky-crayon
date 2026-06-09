import { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck } from "@fortawesome/pro-solid-svg-icons";
import {
  LOCALES,
  type SupportedLocale,
} from "@one-colored-pixel/translations";
import i18n from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { selectionChanged } from "@/utils/haptics";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { COLORS, SHEET_HANDLE, SHADOWS } from "@/lib/design";

/**
 * In-app language switcher (bottom sheet). Lists English + every translated
 * locale with its native name and flag. Selecting one changes the app language
 * instantly (i18next.changeLanguage — react-i18next re-renders everything) and
 * persists the choice (settingsStore.preferredLocale), which overrides the
 * device default on subsequent launches. Language is a cosmetic preference, so
 * it is NOT parental-gated.
 *
 * Detents are [0, "content"] — never fixed px — so the sheet measures its own
 * height and doesn't red-screen on short landscape phones.
 */

type LanguageOption = {
  code: SupportedLocale;
  nativeName: string;
  flag: string;
};

// English first (the source locale isn't in LOCALES), then the rest in the
// shared package's order. Flags mirror the web switcher.
const FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  ja: "🇯🇵",
  ko: "🇰🇷",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  "zh-Hans": "🇨🇳",
  "zh-Hant": "🇹🇼",
};

const OPTIONS: LanguageOption[] = [
  { code: "en", nativeName: "English", flag: FLAGS.en },
  ...LOCALES.map((l) => ({
    code: l.code as SupportedLocale,
    nativeName: l.nativeName,
    flag: FLAGS[l.code as SupportedLocale],
  })),
];

type LanguageSwitcherProps = {
  isOpen: boolean;
  onClose: () => void;
};

const LanguageSwitcher = ({ isOpen, onClose }: LanguageSwitcherProps) => {
  const insets = useSafeAreaInsets();
  const { t, i18n: i18nInstance } = useTranslation();
  const setPreferredLocale = useSettingsStore((s) => s.setPreferredLocale);

  // The live language drives the checkmark; reading from the i18n instance keeps
  // it correct whether the active locale came from the device or a saved override.
  const activeLocale = i18nInstance.language as SupportedLocale;

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) onClose();
    },
    [onClose],
  );

  const handleSelect = useCallback(
    (code: SupportedLocale) => {
      if (code !== activeLocale) {
        selectionChanged();
        track(ANALYTICS_EVENTS.LANGUAGE_CHANGED, {
          fromLocale: activeLocale,
          toLocale: code,
        });
        // Persist first so the startup mirror in _layout.tsx is consistent, then
        // flip the runtime language (react-i18next re-renders subscribers).
        setPreferredLocale(code);
        void i18n.changeLanguage(code);
      }
      onClose();
    },
    [activeLocale, setPreferredLocale, onClose],
  );

  return (
    <ModalBottomSheet
      index={isOpen ? 1 : 0}
      onIndexChange={handleIndexChange}
      detents={[0, "content"]}
      scrimColor="rgba(0, 0, 0, 0.5)"
    >
      <View style={styles.surface}>
        <View style={styles.handleIndicator} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("language.selectLanguage")}</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {OPTIONS.map((option) => {
            const isActive = option.code === activeLocale;
            return (
              <Pressable
                key={option.code}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => handleSelect(option.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={option.nativeName}
              >
                <Text style={styles.flag}>{option.flag}</Text>
                <Text
                  style={[styles.label, isActive && styles.labelActive]}
                  numberOfLines={1}
                >
                  {option.nativeName}
                </Text>
                {isActive && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    size={18}
                    color={COLORS.crayonOrange}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </ModalBottomSheet>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: COLORS.bgCream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  handleIndicator: {
    ...SHEET_HANDLE,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  rowActive: {
    backgroundColor: COLORS.crayonPeachLight,
    borderWidth: 2,
    borderColor: COLORS.crayonOrange,
  },
  flag: {
    fontSize: 26,
  },
  label: {
    flex: 1,
    fontFamily: "TondoTrial-Regular",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  labelActive: {
    fontFamily: "TondoTrial-Bold",
    color: COLORS.crayonOrangeDark,
  },
});

export default LanguageSwitcher;
