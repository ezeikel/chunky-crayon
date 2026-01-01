import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faTrophy,
  faLock,
  faCheck,
  faGift,
  faClock,
  faStar,
} from "@fortawesome/pro-solid-svg-icons";
import AppHeader from "@/components/AppHeader";
import useHeaderData from "@/hooks/useHeaderData";
import { useUserContext } from "@/contexts";
import { useChallenges, useClaimChallengeReward } from "@/hooks/api/useChallenges";
import type { ChallengeWithProgress } from "@/api";

// Weekly Challenge Card (current active challenge)
type WeeklyChallengeCardProps = {
  challenge: ChallengeWithProgress;
  onClaimReward: () => void;
  isClaimingReward: boolean;
};

const WeeklyChallengeCard = ({
  challenge,
  onClaimReward,
  isClaimingReward,
}: WeeklyChallengeCardProps) => {
  const { challenge: def, progress, isCompleted, percentComplete, daysRemaining, rewardClaimed } = challenge;

  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyLabel}>This Week's Challenge</Text>
        {daysRemaining > 0 && (
          <View style={styles.daysRemaining}>
            <FontAwesomeIcon icon={faClock} size={12} color="#9CA3AF" />
            <Text style={styles.daysRemainingText}>
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
            </Text>
          </View>
        )}
      </View>

      <View style={styles.weeklyContent}>
        <Text style={styles.weeklyIcon}>{def.icon}</Text>
        <View style={styles.weeklyInfo}>
          <Text style={styles.weeklyTitle}>{def.title}</Text>
          <Text style={styles.weeklyDescription}>{def.description}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.weeklyProgress}>
        <View style={styles.progressBarLarge}>
          <View
            style={[
              styles.progressFillLarge,
              { width: `${percentComplete}%` },
              isCompleted && styles.progressFillCompleted,
            ]}
          />
        </View>
        <Text style={styles.progressTextLarge}>
          {progress}/{def.requirement}
        </Text>
      </View>

      {/* Reward Section */}
      {isCompleted && !rewardClaimed && (
        <Pressable
          style={[styles.claimButton, isClaimingReward && styles.claimButtonDisabled]}
          onPress={onClaimReward}
          disabled={isClaimingReward}
        >
          {isClaimingReward ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesomeIcon icon={faGift} size={18} color="#FFFFFF" />
              <Text style={styles.claimButtonText}>Claim Reward!</Text>
            </>
          )}
        </Pressable>
      )}

      {isCompleted && rewardClaimed && (
        <View style={styles.completedBadge}>
          <FontAwesomeIcon icon={faCheck} size={16} color="#22C55E" />
          <Text style={styles.completedText}>Completed!</Text>
        </View>
      )}
    </View>
  );
};

// Past Challenge Card
type PastChallengeCardProps = {
  challenge: ChallengeWithProgress;
};

const PastChallengeCard = ({ challenge }: PastChallengeCardProps) => {
  const { challenge: def, isCompleted, rewardClaimed } = challenge;

  return (
    <View style={[styles.pastCard, !isCompleted && styles.pastCardIncomplete]}>
      <Text style={styles.pastIcon}>{def.icon}</Text>
      <View style={styles.pastInfo}>
        <Text style={styles.pastTitle}>{def.title}</Text>
        <Text style={styles.pastStatus}>
          {isCompleted ? (rewardClaimed ? "Completed" : "Reward unclaimed") : "Incomplete"}
        </Text>
      </View>
      {isCompleted && (
        <View style={styles.pastCheck}>
          <FontAwesomeIcon icon={faCheck} size={14} color="#22C55E" />
        </View>
      )}
    </View>
  );
};

// Lifetime Achievement Card (keeping the existing milestone challenges)
type AchievementCardProps = {
  title: string;
  description: string;
  progress: number;
  total: number;
  isLocked?: boolean;
};

const AchievementCard = ({
  title,
  description,
  progress,
  total,
  isLocked = false,
}: AchievementCardProps) => (
  <View style={[styles.achievementCard, isLocked && styles.achievementCardLocked]}>
    <View style={styles.achievementIconContainer}>
      <FontAwesomeIcon
        icon={isLocked ? faLock : faStar}
        size={20}
        color={isLocked ? "#9CA3AF" : "#F59E0B"}
      />
    </View>
    <View style={styles.achievementContent}>
      <Text style={[styles.achievementTitle, isLocked && styles.textLocked]}>
        {title}
      </Text>
      <Text style={[styles.achievementDescription, isLocked && styles.textLocked]}>
        {description}
      </Text>
      {!isLocked && (
        <View style={styles.achievementProgress}>
          <View style={styles.progressBarSmall}>
            <View
              style={[
                styles.progressFillSmall,
                { width: `${Math.min((progress / total) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressTextSmall}>
            {Math.min(progress, total)}/{total}
          </Text>
        </View>
      )}
    </View>
  </View>
);

const ChallengesScreen = () => {
  const headerData = useHeaderData();
  const { activeProfile } = useUserContext();
  const { data: challengesData, isLoading } = useChallenges();
  const claimReward = useClaimChallengeReward();

  const currentChallenge = challengesData?.currentChallenge;
  const history = challengesData?.history || [];

  // Get artwork count from active profile for lifetime achievements
  const artworkCount = activeProfile?.artworkCount ?? 0;

  // Lifetime achievements (always shown)
  const achievements = [
    {
      id: "first-steps",
      title: "First Steps",
      description: "Complete your first coloring page",
      progress: artworkCount,
      total: 1,
      isLocked: false,
    },
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Complete 5 coloring pages",
      progress: artworkCount,
      total: 5,
      isLocked: false,
    },
    {
      id: "dedicated-artist",
      title: "Dedicated Artist",
      description: "Complete 10 coloring pages",
      progress: artworkCount,
      total: 10,
      isLocked: artworkCount < 5,
    },
    {
      id: "master-artist",
      title: "Master Artist",
      description: "Complete 50 coloring pages",
      progress: artworkCount,
      total: 50,
      isLocked: artworkCount < 10,
    },
  ];

  const handleClaimReward = async () => {
    if (!currentChallenge) return;

    try {
      const result = await claimReward.mutateAsync(currentChallenge.weeklyChallengeId);
      if (result.success) {
        Alert.alert(
          "Reward Claimed!",
          `You earned a new ${result.reward?.type === "sticker" ? "sticker" : "Colo accessory"}!`,
          [{ text: "Awesome!" }],
        );
      }
    } catch {
      Alert.alert("Error", "Failed to claim reward. Please try again.");
    }
  };

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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E46444" />
            </View>
          ) : (
            <>
              {/* Weekly Challenge */}
              {currentChallenge ? (
                <View style={styles.section}>
                  <WeeklyChallengeCard
                    challenge={currentChallenge}
                    onClaimReward={handleClaimReward}
                    isClaimingReward={claimReward.isPending}
                  />
                </View>
              ) : (
                <View style={styles.noChallengeCard}>
                  <FontAwesomeIcon icon={faTrophy} size={32} color="#D1D5DB" />
                  <Text style={styles.noChallengeText}>
                    No active challenge this week
                  </Text>
                  <Text style={styles.noChallengeSubtext}>
                    Check back soon for new challenges!
                  </Text>
                </View>
              )}

              {/* Past Challenges */}
              {history.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Past Challenges</Text>
                  <View style={styles.pastList}>
                    {history.map((challenge) => (
                      <PastChallengeCard
                        key={challenge.weeklyChallengeId}
                        challenge={challenge}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Lifetime Achievements */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lifetime Achievements</Text>
                <View style={styles.achievementsList}>
                  {achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      title={achievement.title}
                      description={achievement.description}
                      progress={achievement.progress}
                      total={achievement.total}
                      isLocked={achievement.isLocked}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#374151",
    marginBottom: 12,
  },

  // Weekly Challenge Card
  weeklyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  weeklyLabel: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 12,
    color: "#E46444",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  daysRemaining: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  daysRemainingText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
  },
  weeklyContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  weeklyIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  weeklyInfo: {
    flex: 1,
  },
  weeklyTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
    marginBottom: 4,
  },
  weeklyDescription: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  weeklyProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  progressBarLarge: {
    flex: 1,
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFillLarge: {
    height: "100%",
    backgroundColor: "#E46444",
    borderRadius: 5,
  },
  progressFillCompleted: {
    backgroundColor: "#22C55E",
  },
  progressTextLarge: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
    minWidth: 40,
    textAlign: "right",
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  completedText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#22C55E",
  },

  // No Challenge Card
  noChallengeCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noChallengeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  noChallengeSubtext: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },

  // Past Challenges
  pastList: {
    gap: 8,
  },
  pastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 12,
  },
  pastCardIncomplete: {
    opacity: 0.6,
  },
  pastIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pastInfo: {
    flex: 1,
  },
  pastTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#374151",
  },
  pastStatus: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 12,
    color: "#9CA3AF",
  },
  pastCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Lifetime Achievements
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 15,
    color: "#374151",
    marginBottom: 2,
  },
  achievementDescription: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  textLocked: {
    color: "#9CA3AF",
  },
  achievementProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarSmall: {
    flex: 1,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressFillSmall: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 2.5,
  },
  progressTextSmall: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 11,
    color: "#F59E0B",
    minWidth: 28,
    textAlign: "right",
  },
});

export default ChallengesScreen;
