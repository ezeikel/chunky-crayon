import { useState, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Switch,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import Spinner from "@/components/Spinner/Spinner";
import { toast } from "@/components/Toaster";
import ConfirmSheet from "@/components/ConfirmSheet";
import { resetLocalDeviceData } from "@/lib/dev/resetLocalData";
import { LinearGradient } from "expo-linear-gradient";
import DashedRing from "@/components/DashedRing/DashedRing";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faCreditCard,
  faGlobe,
  faVolumeHigh,
  faMusic,
  faMobileVibrate,
  faCircleQuestion,
  faEnvelope,
  faChevronRight,
  faStar,
  faShieldCheck,
  faFileLines,
  faLock,
  faRightFromBracket,
  faLink,
  faCheck,
  faInfoCircle,
  faBookOpen,
  faPlus,
  faTrashCan,
} from "@fortawesome/pro-duotone-svg-icons";
import { faHeart } from "@fortawesome/pro-regular-svg-icons";
import {
  faGoogle,
  faApple,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";
import * as Application from "expo-application";
import Constants from "expo-constants";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ProfileAvatar from "@/components/ProfileAvatar/ProfileAvatar";
import SubscriptionManager from "@/components/SubscriptionManager";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useT } from "@/lib/i18n/useT";
import { LOCALES } from "@one-colored-pixel/translations";
import { usePlanName, useCredits } from "@/hooks/useEntitlements";
import {
  useProfiles,
  useActiveProfile,
  useSetActiveProfile,
} from "@/hooks/api/useProfiles";
import {
  PLAN_COLORS,
  PLAN_ICONS,
  PLAN_DISPLAY_NAMES_WITH_FREE,
  type PlanKey,
} from "@/lib/paywall/plans";
import { COLORS, CRAYON, SHADOWS } from "@/lib/design";
import {
  tapMedium,
  selectionChanged,
  setHapticsEnabled,
} from "@/utils/haptics";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuth } from "@/contexts";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useFeatureFlag } from "posthog-react-native";

// PostHog flag that gates the Facebook login button. Facebook isn't wired up
// natively yet (no FB app id / client token in EAS, so the fbsdk plugin isn't
// in the build) — tapping the button crashed the app. Gate it OFF until we ship
// FB creds + native config before the App Store release. `useFeatureFlag`
// returns undefined for a missing/loading flag, so we treat ONLY an explicit
// `true` as enabled (default-off, crash-safe). Flag must exist in PostHog.
const FACEBOOK_LOGIN_FLAG = "mobile-facebook-login";

type SettingsItemProps = {
  icon: IconDefinition;
  iconColor: string;
  /** Lighter tint of the same hue for the duotone secondary layer. */
  iconSecondaryColor?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showLock?: boolean;
};

const SettingsItem = ({
  icon,
  iconColor,
  iconSecondaryColor,
  title,
  subtitle,
  onPress,
  showLock,
}: SettingsItemProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.settingsItem,
      pressed && styles.settingsItemPressed,
    ]}
    onPress={onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <FontAwesomeIcon
        icon={icon}
        size={18}
        color={iconColor}
        secondaryColor={iconSecondaryColor ?? iconColor}
        secondaryOpacity={iconSecondaryColor ? 1 : 0.4}
      />
    </View>
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
    </View>
    <View style={styles.itemRight}>
      {showLock && (
        <FontAwesomeIcon
          icon={faLock}
          size={12}
          color="#9CA3AF"
          style={{ marginRight: 8 }}
        />
      )}
      <FontAwesomeIcon icon={faChevronRight} size={14} color="#9CA3AF" />
    </View>
  </Pressable>
);

type SettingsToggleProps = {
  icon: IconDefinition;
  iconColor: string;
  iconSecondaryColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const SettingsToggle = ({
  icon,
  iconColor,
  iconSecondaryColor,
  title,
  subtitle,
  value,
  onValueChange,
}: SettingsToggleProps) => (
  <View style={styles.settingsItem}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <FontAwesomeIcon
        icon={icon}
        size={18}
        color={iconColor}
        secondaryColor={iconSecondaryColor ?? iconColor}
        secondaryOpacity={iconSecondaryColor ? 1 : 0.4}
      />
    </View>
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#E5E7EB", true: "#F1AE7E" }}
      thumbColor={value ? "#E46444" : "#FFFFFF"}
      ios_backgroundColor="#E5E7EB"
    />
  </View>
);

// One circular profile-avatar disc in the Account row. Active disc gets the
// brand-orange ring + a check badge; the trailing "Add" disc is a dashed
// outline with a plus. Mirrors the character/scene picker disc pattern.
const PROFILE_DISC = 64;
// Ring sits OUTSIDE the avatar with a visible gap (ring | gap | avatar), so the
// avatar's coloured circle never touches the ring — at gap 0 it reads as
// clipped/cramped even though nothing is cropped.
const PROFILE_RING = 4;
const PROFILE_RING_GAP = 3;
const PROFILE_DISC_BOX = PROFILE_DISC + 2 * (PROFILE_RING + PROFILE_RING_GAP);

type SettingsT = (key: string, params?: Record<string, unknown>) => string;

type ProfileDiscProps = {
  avatarId: string;
  name: string;
  active: boolean;
  onPress: () => void;
  t: SettingsT;
};

const ProfileDisc = ({
  avatarId,
  name,
  active,
  onPress,
  t,
}: ProfileDiscProps) => (
  <Pressable
    style={styles.discWrap}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={
      active ? t("profiles.currentProfileA11y", { name }) : name
    }
  >
    <View style={[styles.disc, active && styles.discActive]}>
      <ProfileAvatar avatarId={avatarId} name={name} size="md" />
    </View>
    {active && (
      <View style={styles.discCheck}>
        <FontAwesomeIcon icon={faCheck} size={10} color={COLORS.white} />
      </View>
    )}
    <Text style={styles.discName} numberOfLines={1}>
      {name}
    </Text>
  </Pressable>
);

const AddProfileDisc = ({
  onPress,
  t,
}: {
  onPress: () => void;
  t: SettingsT;
}) => (
  <Pressable
    style={styles.discWrap}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={t("profiles.addA11y")}
  >
    <View style={[styles.disc, styles.discAdd]}>
      {/* Sized to the full disc box so the dashed ring lands where the solid
          ring sits on selected profiles; discAdd zeroes the parent borderWidth
          (see DashedRing's parent contract). */}
      <DashedRing
        size={PROFILE_DISC_BOX}
        color={COLORS.crayonOrange}
        dash="7 6"
        fill="rgba(228, 100, 68, 0.08)"
      />
      <FontAwesomeIcon
        icon={faPlus}
        size={20}
        color={COLORS.crayonOrange}
        secondaryColor={COLORS.secondaryOrange}
        secondaryOpacity={1}
      />
    </View>
    <Text style={styles.discName} numberOfLines={1}>
      {t("profiles.add")}
    </Text>
  </Pressable>
);

const SettingsScreen = () => {
  const t = useT("mobile.settings");
  const tButton = useT("mobile.button");
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const planName = usePlanName();
  const credits = useCredits();

  // Profiles — active one drives the header card; the full list renders as the
  // avatar-disc row. Switching is optimistic via React Query invalidation.
  const { data: profilesData } = useProfiles();
  const { data: activeProfileData } = useActiveProfile();
  const setActiveProfile = useSetActiveProfile();
  const profiles = profilesData?.profiles ?? [];
  const activeProfile = activeProfileData?.activeProfile ?? null;

  const isPaidPlan = planName !== "FREE";
  const planLabel = PLAN_DISPLAY_NAMES_WITH_FREE[planName];
  const planColor = isPaidPlan
    ? PLAN_COLORS[planName as PlanKey]
    : COLORS.crayonOrange;
  const planIcon = isPaidPlan ? PLAN_ICONS[planName as PlanKey] : faCreditCard;
  const {
    isLoading: authLoading,
    isAuthenticated,
    isLinked,
    user,
    signInWithGoogleHandler,
    signInWithAppleHandler,
    signInWithFacebookHandler,
    sendMagicLinkHandler,
    signOut,
  } = useAuth();

  // Default-off: only an explicit `true` shows the FB button (undefined while
  // loading / missing flag → hidden). Keeps the unconfigured FB native module
  // from being reachable and crashing the app.
  const isFacebookLoginEnabled = useFeatureFlag(FACEBOOK_LOGIN_FLAG) === true;

  // Audio preference states
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(true);

  // Vibration (haptics) preference — persisted; mirrored into the haptics
  // module on change (see _layout) so every buzz across the app respects it.
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsPref = useSettingsStore((s) => s.setHapticsEnabled);

  // Sign-in modal state
  const [signInModalVisible, setSignInModalVisible] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);

  // Profile switcher state
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);

  // Language switcher state. The subtitle shows the active language's native
  // name so the row reflects the device default OR a saved override.
  const [languageSwitcherOpen, setLanguageSwitcherOpen] = useState(false);
  const { i18n: i18nInstance } = useTranslation();
  const activeLanguageName =
    LOCALES.find((l) => l.code === i18nInstance.language)?.nativeName ??
    "English";

  // Subscription modal state
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);

  // Sign-out confirm sheet
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  // DEV-only: reset-local-data confirm sheet.
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleManageProfiles = () => {
    setProfileSwitcherOpen(true);
  };

  const handleSelectProfile = (profileId: string) => {
    if (profileId === activeProfile?.id) {
      // Tapping the active profile opens the manager (rename/switch/add).
      setProfileSwitcherOpen(true);
      return;
    }
    tapMedium();
    setActiveProfile.mutate(profileId);
  };

  const handleSubscription = () => {
    setSubscriptionModalVisible(true);
  };

  const handleLanguage = () => {
    setLanguageSwitcherOpen(true);
  };

  const handleSupport = () => {
    Linking.openURL("mailto:support@chunkycrayon.com");
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: "https://apps.apple.com/app/chunky-crayon",
      android: "https://play.google.com/store/apps/details?id=com.chunkycrayon",
    });
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  const handlePrivacy = () => {
    Linking.openURL("https://chunkycrayon.com/privacy");
  };

  const handleTerms = () => {
    Linking.openURL("https://chunkycrayon.com/terms");
  };

  const handleSignIn = () => {
    setSignInModalVisible(true);
    setMagicLinkSent(false);
    setMagicLinkEmail("");
  };

  const handleSignOut = () => {
    setSignOutConfirmOpen(true);
  };

  const confirmSignOut = async () => {
    await signOut();
    toast.success(t("toast.signedOut"));
  };

  // DEV-only: wipe ALL local device data (MMKV + AsyncStorage + auth +
  // on-disk artwork), then prompt to restart so the cleared stores rehydrate
  // empty. Guarded by __DEV__ so it never ships in a release build.
  const confirmResetLocalData = async () => {
    try {
      await resetLocalDeviceData();
      Alert.alert(
        "Local data cleared",
        "All on-device data was reset. Please fully close and reopen the app.",
      );
    } catch {
      toast.error("Couldn't reset local data. Check the logs.");
    }
  };

  const handleGoogleSignIn = async () => {
    setSignInLoading(true);
    try {
      const result = await signInWithGoogleHandler();
      if (result) {
        setSignInModalVisible(false);
        toast.success(
          result.wasMerged
            ? t("toast.accountLinked")
            : t("toast.signedIn"),
        );
      }
    } catch {
      toast.error(t("toast.googleSignInFailed"));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setSignInLoading(true);
    try {
      const result = await signInWithAppleHandler();
      if (result) {
        setSignInModalVisible(false);
        toast.success(
          result.wasMerged
            ? t("toast.accountLinked")
            : t("toast.signedIn"),
        );
      }
    } catch {
      toast.error(t("toast.appleSignInFailed"));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setSignInLoading(true);
    try {
      const result = await signInWithFacebookHandler();
      if (result) {
        setSignInModalVisible(false);
        toast.success(
          result.wasMerged
            ? t("toast.accountLinked")
            : t("toast.signedIn"),
        );
      }
    } catch {
      toast.error(t("toast.facebookSignInFailed"));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail || !magicLinkEmail.includes("@")) {
      toast.error(t("toast.invalidEmail"));
      return;
    }

    setSignInLoading(true);
    try {
      const success = await sendMagicLinkHandler(magicLinkEmail);
      if (success) {
        setMagicLinkSent(true);
      } else {
        toast.error(t("toast.magicLinkFailed"));
      }
    } catch {
      toast.error(t("toast.magicLinkFailed"));
    } finally {
      setSignInLoading(false);
    }
  };

  // Settings entry is parent-gated upstream at the Home gear corner, so
  // the screen opens directly here (no in-screen gate). The native stack
  // header provides the back button.
  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile header card — the active profile (avatar + name + plan
              chip). Tapping opens the profile manager. */}
          {activeProfile && (
            <Pressable
              style={({ pressed }) => [
                styles.headerCard,
                pressed && styles.headerCardPressed,
              ]}
              onPress={handleManageProfiles}
              accessibilityRole="button"
              accessibilityLabel={t("profiles.manageA11y", {
                name: activeProfile.name,
              })}
            >
              <ProfileAvatar
                avatarId={activeProfile.avatarId}
                name={activeProfile.name}
                size="lg"
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {activeProfile.name}
                </Text>
                <View
                  style={[
                    styles.planChip,
                    { backgroundColor: `${planColor}26` },
                  ]}
                >
                  <FontAwesomeIcon
                    icon={planIcon}
                    size={11}
                    color={planColor}
                    secondaryColor={planColor}
                    secondaryOpacity={0.4}
                  />
                  <Text style={[styles.planChipText, { color: planColor }]}>
                    {t("planChip", { plan: planLabel })}
                  </Text>
                </View>
              </View>
              <FontAwesomeIcon
                icon={faChevronRight}
                size={16}
                color="#9CA3AF"
              />
            </Pressable>
          )}

          {/* Subscription banner — plan + credits, opens the manager. */}
          <Pressable
            style={({ pressed }) => [pressed && styles.bannerPressed]}
            onPress={handleSubscription}
            accessibilityRole="button"
            accessibilityLabel={t("bannerA11y", {
              plan: planLabel,
              credits,
            })}
          >
            <LinearGradient
              colors={[`${planColor}E6`, planColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.bannerIcon}>
                <FontAwesomeIcon
                  icon={planIcon}
                  size={22}
                  color={COLORS.white}
                  secondaryColor={COLORS.white}
                  secondaryOpacity={0.45}
                />
              </View>
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerTitle}>
                  {t("bannerPlanTitle", { plan: planLabel })}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {t("creditCount", {
                    count: credits,
                    formattedCount: credits.toLocaleString(),
                  })}
                  {isPaidPlan ? "" : t("bannerSubtitleUpgrade")}
                </Text>
              </View>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>
                  {isPaidPlan ? t("bannerCtaManage") : t("bannerCtaUpgrade")}
                </Text>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  size={12}
                  color={COLORS.white}
                />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Profiles Section — avatar-disc row */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.profiles")}</Text>
            {/* Avatar-disc row — each child profile as a tappable disc, active
                one ringed, plus an Add disc (opens the manager). */}
            <View style={styles.discRowCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.discRow}
              >
                {profiles.map((profile) => (
                  <ProfileDisc
                    key={profile.id}
                    avatarId={profile.avatarId}
                    name={profile.name}
                    active={profile.id === activeProfile?.id}
                    onPress={() => handleSelectProfile(profile.id)}
                    t={t}
                  />
                ))}
                <AddProfileDisc onPress={handleManageProfiles} t={t} />
              </ScrollView>
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.account")}</Text>
            <View style={styles.sectionContent}>
              {isLinked ? (
                <SettingsItem
                  icon={faRightFromBracket}
                  iconColor={COLORS.error}
                  iconSecondaryColor="#FCA5A5"
                  title={t("signOut.title")}
                  subtitle={user?.email || t("signOut.subtitle")}
                  onPress={handleSignOut}
                />
              ) : (
                <SettingsItem
                  icon={faLink}
                  iconColor={CRAYON.purple.base}
                  iconSecondaryColor={CRAYON.purple.light}
                  title={t("signIn.title")}
                  subtitle={t("signIn.subtitle")}
                  onPress={handleSignIn}
                />
              )}
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.preferences")}</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faGlobe}
                iconColor={CRAYON.blue.base}
                iconSecondaryColor={CRAYON.blue.light}
                title={t("language.title")}
                subtitle={activeLanguageName}
                onPress={handleLanguage}
              />
              <SettingsToggle
                icon={faVolumeHigh}
                iconColor={CRAYON.yellow.dark}
                iconSecondaryColor={CRAYON.yellow.base}
                title={t("soundEffects.title")}
                subtitle={t("soundEffects.subtitle")}
                value={soundEffectsEnabled}
                onValueChange={(next) => {
                  selectionChanged(); // toggle switch = selection-style haptic
                  setSoundEffectsEnabled(next);
                }}
              />
              <SettingsToggle
                icon={faMusic}
                iconColor={CRAYON.purple.base}
                iconSecondaryColor={CRAYON.purple.light}
                title={t("backgroundMusic.title")}
                subtitle={t("backgroundMusic.subtitle")}
                value={backgroundMusicEnabled}
                onValueChange={(next) => {
                  selectionChanged(); // toggle switch = selection-style haptic
                  setBackgroundMusicEnabled(next);
                }}
              />
              <SettingsToggle
                icon={faMobileVibrate}
                iconColor={CRAYON.blue.dark}
                iconSecondaryColor={CRAYON.blue.base}
                title={t("vibration.title")}
                subtitle={t("vibration.subtitle")}
                value={hapticsEnabled}
                onValueChange={(next) => {
                  // Flip the module gate synchronously (the _layout effect also
                  // mirrors it, but that's next-render) so the confirming buzz
                  // fires immediately when turning ON. When turning OFF the buzz
                  // is gated away, as intended.
                  setHapticsEnabled(next);
                  setHapticsPref(next);
                  if (next) selectionChanged();
                }}
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.support")}</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faCircleQuestion}
                iconColor={CRAYON.green.base}
                iconSecondaryColor={CRAYON.green.light}
                title={t("help.title")}
                subtitle={t("help.subtitle")}
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faEnvelope}
                iconColor={COLORS.crayonOrange}
                iconSecondaryColor={COLORS.secondaryOrange}
                title={t("contact.title")}
                subtitle="support@chunkycrayon.com"
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faStar}
                iconColor={CRAYON.pink.base}
                iconSecondaryColor={CRAYON.pink.light}
                title={t("rate.title")}
                subtitle={t("rate.subtitle")}
                onPress={handleRateApp}
              />
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.legal")}</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faShieldCheck}
                iconColor={CRAYON.green.dark}
                iconSecondaryColor={CRAYON.green.base}
                title={t("privacy.title")}
                onPress={handlePrivacy}
              />
              <SettingsItem
                icon={faFileLines}
                iconColor={CRAYON.blue.base}
                iconSecondaryColor={CRAYON.blue.light}
                title={t("terms.title")}
                onPress={handleTerms}
              />
            </View>
          </View>

          {/* App Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("section.appInfo")}</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faBookOpen}
                iconColor={CRAYON.yellow.dark}
                iconSecondaryColor={CRAYON.yellow.base}
                title={t("onboarding.title")}
                subtitle={t("onboarding.subtitle")}
                onPress={() => {
                  useOnboardingStore.getState().reset();
                  router.replace("/onboarding");
                }}
              />
              <View style={styles.settingsItem}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "rgba(156, 163, 175, 0.2)" },
                  ]}
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    size={18}
                    color="#9CA3AF"
                    secondaryColor="#9CA3AF"
                    secondaryOpacity={0.4}
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{t("version.title")}</Text>
                  <Text style={styles.itemSubtitle}>
                    {Application.nativeApplicationVersion || appVersion}
                    {Application.nativeBuildVersion
                      ? ` (${Application.nativeBuildVersion})`
                      : ""}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Developer tools — DEV builds only (never ships in release). */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer</Text>
              <View style={styles.sectionContent}>
                <SettingsItem
                  icon={faTrashCan}
                  iconColor={COLORS.error}
                  iconSecondaryColor="#FCA5A5"
                  title="Reset local data"
                  subtitle="Wipe all on-device data (artwork, settings, sign-in)"
                  onPress={() => setResetConfirmOpen(true)}
                />
              </View>
            </View>
          )}

          {/* Made with love footer */}
          <View style={styles.footerContainer}>
            <View style={styles.madeWithRow}>
              <Text style={styles.madeWithText}>{t("madeWith")} </Text>
              <FontAwesomeIcon icon={faHeart} size={12} color="#EF4444" />
              <Text style={styles.madeWithText}> {t("madeWithIn")} </Text>
              <Text style={styles.madeWithLocation}>
                {t("madeWithLocation")}
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Sign In Modal */}
      <Modal
        visible={signInModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSignInModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("signInModal.title")}</Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setSignInModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{tButton("cancel")}</Text>
            </Pressable>
          </View>

          {magicLinkSent ? (
            <View style={styles.magicLinkSentContainer}>
              <View style={styles.magicLinkSentIcon}>
                <FontAwesomeIcon icon={faEnvelope} size={48} color="#E46444" />
              </View>
              <Text style={styles.magicLinkSentTitle}>
                {t("magicLinkSent.title")}
              </Text>
              <Text style={styles.magicLinkSentText}>
                {t("magicLinkSent.body", { email: magicLinkEmail })}
              </Text>
              <Text style={styles.magicLinkSentSubtext}>
                {t("magicLinkSent.subtext")}
              </Text>
              <Pressable
                style={styles.magicLinkRetryButton}
                onPress={() => setMagicLinkSent(false)}
              >
                <Text style={styles.magicLinkRetryText}>
                  {t("magicLinkSent.useDifferentEmail")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                {t("signInModal.subtitle")}
              </Text>

              {/* Social Sign In Buttons */}
              <View style={styles.socialButtonsContainer}>
                {Platform.OS === "ios" && (
                  <Pressable
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={handleAppleSignIn}
                    disabled={signInLoading}
                  >
                    <FontAwesomeIcon icon={faApple} size={20} color="#FFFFFF" />
                    <Text
                      style={[styles.socialButtonText, { color: "#FFFFFF" }]}
                    >
                      {t("signInModal.continueApple")}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignIn}
                  disabled={signInLoading}
                >
                  <FontAwesomeIcon icon={faGoogle} size={20} color="#EA4335" />
                  <Text style={styles.socialButtonText}>
                    {t("signInModal.continueGoogle")}
                  </Text>
                </Pressable>

                {isFacebookLoginEnabled && (
                  <Pressable
                    style={[styles.socialButton, styles.facebookButton]}
                    onPress={handleFacebookSignIn}
                    disabled={signInLoading}
                  >
                    <FontAwesomeIcon
                      icon={faFacebook}
                      size={20}
                      color="#1877F2"
                    />
                    <Text style={styles.socialButtonText}>
                      {t("signInModal.continueFacebook")}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("signInModal.or")}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Magic Link */}
              <View style={styles.magicLinkContainer}>
                <Text style={styles.magicLinkLabel}>
                  {t("signInModal.emailLabel")}
                </Text>
                <TextInput
                  style={styles.magicLinkInput}
                  placeholder={t("signInModal.emailPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  value={magicLinkEmail}
                  onChangeText={setMagicLinkEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!signInLoading}
                />
                <Pressable
                  style={[
                    styles.magicLinkButton,
                    signInLoading && styles.magicLinkButtonDisabled,
                  ]}
                  onPress={handleSendMagicLink}
                  disabled={signInLoading}
                >
                  {signInLoading ? (
                    <Spinner size={20} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.magicLinkButtonText}>
                      {t("signInModal.sendMagicLink")}
                    </Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.privacyNote}>
                {t("signInModal.privacyNote")}
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Profile Switcher Bottom Sheet */}
      <ProfileSwitcher
        isOpen={profileSwitcherOpen}
        onClose={() => setProfileSwitcherOpen(false)}
      />

      {/* Language Switcher Bottom Sheet */}
      <LanguageSwitcher
        isOpen={languageSwitcherOpen}
        onClose={() => setLanguageSwitcherOpen(false)}
      />

      {/* Subscription Manager Modal */}
      <SubscriptionManager
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
      />

      {/* Sign-out confirmation — door icon, not a trash can (nothing is
          erased; artwork stays on the device, hence the one clarifying line). */}
      <ConfirmSheet
        isOpen={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        title={t("signOutConfirm.title")}
        description={t("signOutConfirm.description")}
        icon={faRightFromBracket}
        confirmLabel={t("signOutConfirm.confirm")}
        onConfirm={confirmSignOut}
        tone="destructive"
      />

      {__DEV__ && (
        <ConfirmSheet
          isOpen={resetConfirmOpen}
          onClose={() => setResetConfirmOpen(false)}
          title="Reset local data?"
          description="Wipes ALL on-device data — saved artwork, settings, onboarding, and sign-in. This can't be undone. You'll need to restart the app."
          icon={faTrashCan}
          confirmLabel="Reset"
          onConfirm={confirmResetLocalData}
          tone="destructive"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Profile header card
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    ...SHADOWS.md,
  },
  headerCardPressed: {
    backgroundColor: "#F9FAFB",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 22,
    color: COLORS.textGray,
    marginBottom: 6,
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planChipText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
  },
  // Subscription banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 20,
    ...SHADOWS.md,
  },
  bannerPressed: {
    opacity: 0.9,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  bannerCtaText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 13,
    color: COLORS.white,
  },
  // Profile avatar disc row
  discRowCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    // 8 here + 4 inside the ScrollView content (discRow) = the same visual 12.
    // The split matters: a ScrollView clips children to its own bounds, so any
    // padding out here doesn't stop the active disc's 1.06 scale (+~2.4px) and
    // the check badge (top: -2) from poking above the scroll content top and
    // getting sliced flat — the selected ring rendered with a flat-cut top.
    paddingVertical: 8,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  discRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 14,
  },
  discWrap: {
    alignItems: "center",
    // Room for the disc box + its 1.06 active scale + the check badge.
    width: PROFILE_DISC_BOX + 8,
  },
  disc: {
    // Ring layer sits OUTSIDE the avatar with a breathing gap: box = avatar +
    // (ring + gap) each side, and `overflow: 'visible'` so the avatar centred
    // inside is never cropped. With no gap the avatar's coloured circle touches
    // the ring's inner edge and reads as clipped. No background / shadow here —
    // the ProfileAvatar paints its own circle, and an elevation shadow would
    // draw a square halo on Android. Ring colour is transparent by default;
    // selected adds orange.
    width: PROFILE_DISC_BOX,
    height: PROFILE_DISC_BOX,
    borderRadius: PROFILE_DISC_BOX / 2,
    borderWidth: PROFILE_RING,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  discActive: {
    borderColor: COLORS.crayonOrange,
    transform: [{ scale: 1.06 }],
  },
  discAdd: {
    // Dashed ring is drawn by the shared DashedRing SVG overlay (CSS dashed border
    // octagonizes on Android). Strip the disc's own chrome so only the SVG
    // shows. borderWidth MUST be 0 here: RN places absolute children relative
    // to the padding box, so the base 4px border shifted the SVG ring 4px
    // down-right and the flex-centred "+" icon read off-centre. Zeroing the
    // border is safe — the Add disc has a single state, so there's no
    // width-toggle flash like the selectable discs.
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    overflow: "visible",
    shadowOpacity: 0,
    elevation: 0,
  },
  discCheck: {
    position: "absolute",
    top: -2,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.crayonOrange,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  discName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 11,
    color: COLORS.textGray,
    marginTop: 6,
    maxWidth: PROFILE_DISC_BOX + 8,
    textAlign: "center",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingsItemPressed: {
    backgroundColor: "#F9FAFB",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
  },
  itemSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  footerContainer: {
    alignItems: "center",
    paddingBottom: 8,
  },
  madeWithRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  madeWithText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
  },
  madeWithLocation: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: "#6B7280",
  },
  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  lockedIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  lockedTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  lockedSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: "#E46444",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonPressed: {
    backgroundColor: "#D35A3A",
    transform: [{ scale: 0.98 }],
  },
  verifyButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FDFAF5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#E46444",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  facebookButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  socialButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
    marginHorizontal: 16,
  },
  magicLinkContainer: {
    gap: 12,
  },
  magicLinkLabel: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
  },
  magicLinkInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#374151",
  },
  magicLinkButton: {
    backgroundColor: "#E46444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  magicLinkButtonDisabled: {
    opacity: 0.6,
  },
  magicLinkButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  privacyNote: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
  magicLinkSentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  magicLinkSentIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  magicLinkSentTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: "#374151",
    marginBottom: 12,
  },
  magicLinkSentText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },
  magicLinkSentSubtext: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  magicLinkRetryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  magicLinkRetryText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#E46444",
  },
});

export default SettingsScreen;
