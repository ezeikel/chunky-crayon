import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faHeart, faPalette } from "@fortawesome/pro-solid-svg-icons";
import AppHeader from "@/components/AppHeader";

const MyArtworkScreen = () => {
  return (
    <View className="flex-1">
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={{ flex: 1 }}>
        <AppHeader
          credits={50}
          challengeProgress={40}
          stickerCount={8}
          profileName="Artist"
          coloStage={1}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 100,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <FontAwesomeIcon icon={faHeart} size={48} color="#E46444" />
            </View>
            <Text style={styles.title}>Your Saved Artwork</Text>
            <Text style={styles.subtitle}>
              Your favorite creations will appear here. Start coloring and save
              your masterpieces!
            </Text>
            <View style={styles.tipContainer}>
              <FontAwesomeIcon icon={faPalette} size={16} color="#9CA3AF" />
              <Text style={styles.tipText}>
                Tap the heart icon while coloring to save
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 24,
    color: "#E46444",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  tipText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
});

export default MyArtworkScreen;
