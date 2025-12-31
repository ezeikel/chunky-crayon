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
} from "@fortawesome/pro-solid-svg-icons";
import Constants from "expo-constants";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import AppHeader from "@/components/AppHeader";
import ParentalGate from "@/components/ParentalGate";
import useHeaderData from "@/hooks/useHeaderData";

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

const SettingsScreen = () => {
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const headerData = useHeaderData();

  // Audio preference states
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(true);

  // Parental gate state - entire screen is gated
  const [isParentVerified, setIsParentVerified] = useState(false);
  const [parentalGateVisible, setParentalGateVisible] = useState(true);

  const handleManageProfiles = () => {
    Alert.alert("Profiles", "Profile management screen coming soon!", [
      { text: "OK" },
    ]);
  };

  const handleSubscription = () => {
    Alert.alert("Subscription", "Subscription management screen coming soon!", [
      { text: "OK" },
    ]);
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
                subtitle="Manage your plan"
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
});

export default SettingsScreen;
