import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrophy, faLock } from "@fortawesome/pro-solid-svg-icons";
import AppHeader from "@/components/AppHeader";
import useHeaderData from "@/hooks/useHeaderData";
import { useUserContext } from "@/contexts";

type ChallengeCardProps = {
  title: string;
  description: string;
  progress: number;
  total: number;
  isLocked?: boolean;
};

const ChallengeCard = ({
  title,
  description,
  progress,
  total,
  isLocked = false,
}: ChallengeCardProps) => (
  <View style={[styles.challengeCard, isLocked && styles.challengeCardLocked]}>
    <View style={styles.challengeIconContainer}>
      <FontAwesomeIcon
        icon={isLocked ? faLock : faTrophy}
        size={24}
        color={isLocked ? "#9CA3AF" : "#F59E0B"}
      />
    </View>
    <View style={styles.challengeContent}>
      <Text style={[styles.challengeTitle, isLocked && styles.textLocked]}>
        {title}
      </Text>
      <Text
        style={[styles.challengeDescription, isLocked && styles.textLocked]}
      >
        {description}
      </Text>
      {!isLocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(progress / total) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress}/{total}
          </Text>
        </View>
      )}
    </View>
  </View>
);

const ChallengesScreen = () => {
  const headerData = useHeaderData();
  const { activeProfile } = useUserContext();

  // Get artwork count from active profile
  const artworkCount = activeProfile?.artworkCount ?? 0;

  // Dynamic challenges based on user progress
  const challenges = [
    {
      id: "1",
      title: "First Steps",
      description: "Complete your first coloring page",
      progress: Math.min(artworkCount, 1),
      total: 1,
      isLocked: false,
    },
    {
      id: "2",
      title: "Getting Started",
      description: "Complete 5 coloring pages",
      progress: Math.min(artworkCount, 5),
      total: 5,
      isLocked: false,
    },
    {
      id: "3",
      title: "Dedicated Artist",
      description: "Complete 10 coloring pages",
      progress: Math.min(artworkCount, 10),
      total: 10,
      isLocked: artworkCount < 5,
    },
    {
      id: "4",
      title: "Master Artist",
      description: "Complete 50 coloring pages",
      progress: Math.min(artworkCount, 50),
      total: 50,
      isLocked: artworkCount < 10,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <AppHeader
          credits={headerData.credits}
          challengeProgress={headerData.challengeProgress}
          stickerCount={headerData.stickerCount}
          profileName={headerData.profileName}
          coloStage={headerData.coloStage}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Challenges</Text>
            <Text style={styles.headerSubtitle}>
              Complete challenges to earn rewards!
            </Text>
          </View>

          {/* Challenge Cards */}
          <View style={styles.challengesList}>
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                title={challenge.title}
                description={challenge.description}
                progress={challenge.progress}
                total={challenge.total}
                isLocked={challenge.isLocked}
              />
            ))}
          </View>

          {/* Coming Soon Notice */}
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonText}>
              More challenges coming soon!
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 28,
    color: "#374151",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#9CA3AF",
  },
  challengesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  challengeCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  challengeCardLocked: {
    opacity: 0.6,
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#374151",
    marginBottom: 2,
  },
  challengeDescription: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  textLocked: {
    color: "#9CA3AF",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E46444",
    borderRadius: 3,
  },
  progressText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: "#E46444",
    minWidth: 32,
    textAlign: "right",
  },
  comingSoonContainer: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 16,
  },
  comingSoonText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },
});

export default ChallengesScreen;
