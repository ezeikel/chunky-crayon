import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faUsers,
  faCreditCard,
  faGlobe,
  faVolumeHigh,
  faMusic,
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
} from "@fortawesome/pro-solid-svg-icons";
import {
  faGoogle,
  faApple,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";
import Constants from "expo-constants";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import AppHeader from "@/components/AppHeader";
import ParentalGate from "@/components/ParentalGate";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import SubscriptionManager from "@/components/SubscriptionManager";
import useHeaderData from "@/hooks/useHeaderData";
import { usePlanName } from "@/hooks/useEntitlements";
import { useAuth } from "@/contexts";

type SettingsItemProps = {
  icon: IconDefinition;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showLock?: boolean;
};

const SettingsItem = ({
  icon,
  iconColor,
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
      <FontAwesomeIcon icon={icon} size={18} color={iconColor} />
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
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const SettingsToggle = ({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
}: SettingsToggleProps) => (
  <View style={styles.settingsItem}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <FontAwesomeIcon icon={icon} size={18} color={iconColor} />
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

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  FREE: "Free",
  SPLASH: "Splash Plan",
  RAINBOW: "Rainbow Plan",
  SPARKLE: "Sparkle Plan",
};

const SettingsScreen = () => {
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const headerData = useHeaderData();
  const planName = usePlanName();
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

  // Parental gate state - entire screen is gated
  const [isParentVerified, setIsParentVerified] = useState(false);
  const [parentalGateVisible, setParentalGateVisible] = useState(true);

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

  const handleManageProfiles = () => {
    setProfileSwitcherOpen(true);
  };

  const handleSubscription = () => {
    setSubscriptionModalVisible(true);
  };

  const handleParentalGateSuccess = useCallback(() => {
    setParentalGateVisible(false);
    setIsParentVerified(true);
  }, []);

  const handleParentalGateClose = useCallback(() => {
    setParentalGateVisible(false);
    // Don't set verified - they cancelled
  }, []);

  const handleLanguage = () => {
    Alert.alert("Language", "Language settings coming soon!", [{ text: "OK" }]);
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

  const handleRetryVerification = () => {
    setParentalGateVisible(true);
  };

  const handleSignIn = () => {
    setSignInModalVisible(true);
    setMagicLinkSent(false);
    setMagicLinkEmail("");
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your artwork will remain on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            Alert.alert("Signed Out", "You have been signed out successfully.");
          },
        },
      ],
    );
  };

  const handleGoogleSignIn = async () => {
    setSignInLoading(true);
    try {
      const result = await signInWithGoogleHandler();
      if (result) {
        setSignInModalVisible(false);
        Alert.alert(
          "Success",
          result.wasMerged
            ? "Your account has been linked and artwork synced!"
            : "You are now signed in!",
        );
      }
    } catch {
      Alert.alert("Error", "Failed to sign in with Google. Please try again.");
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
        Alert.alert(
          "Success",
          result.wasMerged
            ? "Your account has been linked and artwork synced!"
            : "You are now signed in!",
        );
      }
    } catch {
      Alert.alert("Error", "Failed to sign in with Apple. Please try again.");
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
        Alert.alert(
          "Success",
          result.wasMerged
            ? "Your account has been linked and artwork synced!"
            : "You are now signed in!",
        );
      }
    } catch {
      Alert.alert(
        "Error",
        "Failed to sign in with Facebook. Please try again.",
      );
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail || !magicLinkEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setSignInLoading(true);
    try {
      const success = await sendMagicLinkHandler(magicLinkEmail);
      if (success) {
        setMagicLinkSent(true);
      } else {
        Alert.alert("Error", "Failed to send magic link. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Failed to send magic link. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  };

  // Show locked state if parent hasn't verified
  if (!isParentVerified && !parentalGateVisible) {
    return (
      <View className="flex-1">
        <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
          <AppHeader
            credits={headerData.credits}
            challengeProgress={headerData.challengeProgress}
            stickerCount={headerData.stickerCount}
            profileName={headerData.profileName}
            coloStage={headerData.coloStage}
          />
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIconContainer}>
              <FontAwesomeIcon icon={faLock} size={48} color="#E46444" />
            </View>
            <Text style={styles.lockedTitle}>Parent Area</Text>
            <Text style={styles.lockedSubtitle}>
              Settings require parent verification to access
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.verifyButtonPressed,
              ]}
              onPress={handleRetryVerification}
            >
              <Text style={styles.verifyButtonText}>Verify to Continue</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <AppHeader
          credits={headerData.credits}
          challengeProgress={headerData.challengeProgress}
          stickerCount={headerData.stickerCount}
          profileName={headerData.profileName}
          coloStage={headerData.coloStage}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.sectionContent}>
              {isLinked ? (
                <>
                  <View style={styles.settingsItem}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: "rgba(34, 197, 94, 0.2)" },
                      ]}
                    >
                      <FontAwesomeIcon
                        icon={faCheck}
                        size={18}
                        color="#22C55E"
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>Signed In</Text>
                      <Text style={styles.itemSubtitle}>
                        {user?.email || "Syncing across devices"}
                      </Text>
                    </View>
                  </View>
                  <SettingsItem
                    icon={faRightFromBracket}
                    iconColor="#EF4444"
                    title="Sign Out"
                    subtitle="Your artwork stays on this device"
                    onPress={handleSignOut}
                  />
                </>
              ) : (
                <SettingsItem
                  icon={faLink}
                  iconColor="#8B5CF6"
                  title="Sign In"
                  subtitle="Sync artwork across devices"
                  onPress={handleSignIn}
                />
              )}
              <SettingsItem
                icon={faUsers}
                iconColor="#E46444"
                title="Manage Profiles"
                subtitle="Add or switch child profiles"
                onPress={handleManageProfiles}
              />
              <SettingsItem
                icon={faCreditCard}
                iconColor="#F1AE7E"
                title="Subscription & Credits"
                subtitle={PLAN_DISPLAY_NAMES[planName] || "Manage your plan"}
                onPress={handleSubscription}
              />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faGlobe}
                iconColor="#E46444"
                title="Language"
                subtitle="English"
                onPress={handleLanguage}
              />
              <SettingsToggle
                icon={faVolumeHigh}
                iconColor="#F1AE7E"
                title="Sound Effects"
                subtitle="Button taps and actions"
                value={soundEffectsEnabled}
                onValueChange={setSoundEffectsEnabled}
              />
              <SettingsToggle
                icon={faMusic}
                iconColor="#E46444"
                title="Background Music"
                subtitle="Ambient sounds while coloring"
                value={backgroundMusicEnabled}
                onValueChange={setBackgroundMusicEnabled}
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={faCircleQuestion}
                iconColor="#F1AE7E"
                title="Help & FAQ"
                subtitle="Get answers to common questions"
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faEnvelope}
                iconColor="#E46444"
                title="Contact Us"
                subtitle="support@chunkycrayon.com"
                onPress={handleSupport}
              />
              <SettingsItem
                icon={faStar}
                iconColor="#F1AE7E"
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
                iconColor="#F1AE7E"
                title="Privacy Policy"
                onPress={handlePrivacy}
              />
              <SettingsItem
                icon={faFileLines}
                iconColor="#E46444"
                title="Terms of Service"
                onPress={handleTerms}
              />
            </View>
          </View>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Chunky Crayon v{appVersion}</Text>
            <Text style={styles.copyrightText}>
              Made with 🖍️ for creative kids
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Parental Gate Modal */}
      <ParentalGate
        visible={parentalGateVisible}
        onClose={handleParentalGateClose}
        onSuccess={handleParentalGateSuccess}
      />

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
                    <ActivityIndicator color="#FFFFFF" />
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
  versionContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  versionText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },
  copyrightText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 4,
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
