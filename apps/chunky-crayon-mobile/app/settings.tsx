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
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";

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

type ProfileDiscProps = {
  avatarId: string;
  name: string;
  active: boolean;
  onPress: () => void;
};

const ProfileDisc = ({ avatarId, name, active, onPress }: ProfileDiscProps) => (
  <Pressable
    style={styles.discWrap}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={`${name}${active ? ", current profile" : ""}`}
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

const AddProfileDisc = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    style={styles.discWrap}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Add a profile"
  >
    <View style={[styles.disc, styles.discAdd]}>
      <FontAwesomeIcon
        icon={faPlus}
        size={20}
        color={COLORS.crayonOrange}
        secondaryColor={COLORS.secondaryOrange}
        secondaryOpacity={1}
      />
    </View>
    <Text style={styles.discName} numberOfLines={1}>
      Add
    </Text>
  </Pressable>
);

const SettingsScreen = () => {
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
    // Locale switching is still a placeholder ("coming soon"); the app is
    // English-only today. Fire with the current locale so the event exists in
    // the funnel and lights up the moment a real toggle ships.
    track(ANALYTICS_EVENTS.LANGUAGE_CHANGED, {
      fromLocale: "en",
      toLocale: "en",
    });
    toast.info("Language settings coming soon!");
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
    toast.success("You're signed out. Your artwork stays on this device.");
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
            ? "Account linked and artwork synced!"
            : "You're signed in!",
        );
      }
    } catch {
      toast.error("Couldn't sign in with Google. Please try again.");
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
            ? "Account linked and artwork synced!"
            : "You're signed in!",
        );
      }
    } catch {
      toast.error("Couldn't sign in with Apple. Please try again.");
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
            ? "Account linked and artwork synced!"
            : "You're signed in!",
        );
      }
    } catch {
      toast.error("Couldn't sign in with Facebook. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail || !magicLinkEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSignInLoading(true);
    try {
      const success = await sendMagicLinkHandler(magicLinkEmail);
      if (success) {
        setMagicLinkSent(true);
      } else {
        toast.error("Couldn't send magic link. Please try again.");
      }
    } catch {
      toast.error("Couldn't send magic link. Please try again.");
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
              accessibilityLabel={`${activeProfile.name}, manage profiles`}
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
                    {planLabel} Plan
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
            accessibilityLabel={`${planLabel} plan, ${credits} credits. Manage subscription.`}
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
                <Text style={styles.bannerTitle}>{planLabel} Plan</Text>
                <Text style={styles.bannerSubtitle}>
                  {credits.toLocaleString()} credit{credits === 1 ? "" : "s"}
                  {isPaidPlan ? "" : " · Upgrade to keep coloring"}
                </Text>
              </View>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>
                  {isPaidPlan ? "Manage" : "Upgrade"}
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
            <Text style={styles.sectionTitle}>Profiles</Text>
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
                  />
                ))}
                <AddProfileDisc onPress={handleManageProfiles} />
              </ScrollView>
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.sectionContent}>
              {isLinked ? (
                <SettingsItem
                  icon={faRightFromBracket}
                  iconColor={COLORS.error}
                  iconSecondaryColor="#FCA5A5"
                  title="Sign Out"
                  subtitle={user?.email || "Your artwork stays on this device"}
                  onPress={handleSignOut}
                />
              ) : (
                <SettingsItem
                  icon={faLink}
                  iconColor={CRAYON.purple.base}
                  iconSecondaryColor={CRAYON.purple.light}
                  title="Sign In"
                  subtitle="Sync artwork across devices"
                  onPress={handleSignIn}
                />
              )}
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faGlobe}
                iconColor={CRAYON.blue.base}
                iconSecondaryColor={CRAYON.blue.light}
                title="Language"
                subtitle="English"
                onPress={handleLanguage}
              />
              <SettingsToggle
                icon={faVolumeHigh}
                iconColor={CRAYON.yellow.dark}
                iconSecondaryColor={CRAYON.yellow.base}
                title="Sound Effects"
                subtitle="Button taps and actions"
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
                title="Background Music"
                subtitle="Ambient sounds while coloring"
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
                title="Vibration"
                subtitle="Gentle buzz on taps and rewards"
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
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faCircleQuestion}
                iconColor={CRAYON.green.base}
                iconSecondaryColor={CRAYON.green.light}
                title="Help & FAQ"
                subtitle="Get answers to common questions"
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faEnvelope}
                iconColor={COLORS.crayonOrange}
                iconSecondaryColor={COLORS.secondaryOrange}
                title="Contact Us"
                subtitle="support@chunkycrayon.com"
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faStar}
                iconColor={CRAYON.pink.base}
                iconSecondaryColor={CRAYON.pink.light}
                title="Rate the App"
                subtitle="Share your feedback"
                onPress={handleRateApp}
              />
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faShieldCheck}
                iconColor={CRAYON.green.dark}
                iconSecondaryColor={CRAYON.green.base}
                title="Privacy Policy"
                onPress={handlePrivacy}
              />
              <SettingsItem
                icon={faFileLines}
                iconColor={CRAYON.blue.base}
                iconSecondaryColor={CRAYON.blue.light}
                title="Terms of Service"
                onPress={handleTerms}
              />
            </View>
          </View>

          {/* App Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Information</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faBookOpen}
                iconColor={CRAYON.yellow.dark}
                iconSecondaryColor={CRAYON.yellow.base}
                title="View Onboarding"
                subtitle="Replay the welcome tour"
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
                  <Text style={styles.itemTitle}>Version</Text>
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
              <Text style={styles.madeWithText}>Made with </Text>
              <FontAwesomeIcon icon={faHeart} size={12} color="#EF4444" />
              <Text style={styles.madeWithText}> in </Text>
              <Text style={styles.madeWithLocation}>South London</Text>
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
            <Text style={styles.modalTitle}>Sign In</Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setSignInModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>

          {magicLinkSent ? (
            <View style={styles.magicLinkSentContainer}>
              <View style={styles.magicLinkSentIcon}>
                <FontAwesomeIcon icon={faEnvelope} size={48} color="#E46444" />
              </View>
              <Text style={styles.magicLinkSentTitle}>Check Your Email!</Text>
              <Text style={styles.magicLinkSentText}>
                We sent a sign-in link to {magicLinkEmail}
              </Text>
              <Text style={styles.magicLinkSentSubtext}>
                Click the link in the email to sign in. The link expires in 15
                minutes.
              </Text>
              <Pressable
                style={styles.magicLinkRetryButton}
                onPress={() => setMagicLinkSent(false)}
              >
                <Text style={styles.magicLinkRetryText}>
                  Use Different Email
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Sign in to sync your artwork across devices and access your
                account on the web.
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
                      Continue with Apple
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
                    Continue with Google
                  </Text>
                </Pressable>

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
                    Continue with Facebook
                  </Text>
                </Pressable>
              </View>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Magic Link */}
              <View style={styles.magicLinkContainer}>
                <Text style={styles.magicLinkLabel}>Sign in with email</Text>
                <TextInput
                  style={styles.magicLinkInput}
                  placeholder="Enter your email"
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
                      Send Magic Link
                    </Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.privacyNote}>
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
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
        title="Sign out?"
        description="Your artwork will stay on this device."
        icon={faRightFromBracket}
        confirmLabel="Sign Out"
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
    paddingVertical: 12,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  discRow: {
    paddingHorizontal: 16,
    gap: 14,
  },
  discWrap: {
    alignItems: "center",
    width: PROFILE_DISC + 8,
  },
  disc: {
    width: PROFILE_DISC,
    height: PROFILE_DISC,
    borderRadius: PROFILE_DISC / 2,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.bgCream,
    ...SHADOWS.md,
  },
  discActive: {
    borderColor: COLORS.crayonOrange,
    transform: [{ scale: 1.06 }],
  },
  discAdd: {
    borderStyle: "dashed",
    borderColor: COLORS.crayonOrange,
    backgroundColor: "rgba(228, 100, 68, 0.08)",
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
    maxWidth: PROFILE_DISC + 8,
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
