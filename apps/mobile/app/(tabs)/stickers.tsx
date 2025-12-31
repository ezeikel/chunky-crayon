import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faStar, faLock, faCheck } from "@fortawesome/pro-solid-svg-icons";
import AppHeader from "@/components/AppHeader";

type StickerCategory = {
  id: string;
  name: string;
  stickers: Sticker[];
};

type Sticker = {
  id: string;
  name: string;
  emoji: string;
  isUnlocked: boolean;
  isNew?: boolean;
};

type StickerItemProps = {
  sticker: Sticker;
  onPress: () => void;
};

const StickerItem = ({ sticker, onPress }: StickerItemProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.stickerItem,
      !sticker.isUnlocked && styles.stickerItemLocked,
      pressed && styles.stickerItemPressed,
    ]}
    onPress={onPress}
    disabled={!sticker.isUnlocked}
  >
    <View style={styles.stickerEmoji}>
      <Text style={styles.stickerEmojiText}>{sticker.emoji}</Text>
      {!sticker.isUnlocked && (
        <View style={styles.lockOverlay}>
          <FontAwesomeIcon icon={faLock} size={16} color="#9CA3AF" />
        </View>
      )}
    </View>
    {sticker.isNew && sticker.isUnlocked && (
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>NEW</Text>
      </View>
    )}
  </Pressable>
);

const StickersScreen = () => {
  // Placeholder sticker data - will be replaced with real data from backend
  const stickerCategories: StickerCategory[] = [
    {
      id: "animals",
      name: "Animals",
      stickers: [
        { id: "1", name: "Cat", emoji: "🐱", isUnlocked: true },
        { id: "2", name: "Dog", emoji: "🐶", isUnlocked: true },
        { id: "3", name: "Bunny", emoji: "🐰", isUnlocked: true, isNew: true },
        { id: "4", name: "Bear", emoji: "🐻", isUnlocked: true },
        { id: "5", name: "Fox", emoji: "🦊", isUnlocked: false },
        { id: "6", name: "Owl", emoji: "🦉", isUnlocked: false },
      ],
    },
    {
      id: "nature",
      name: "Nature",
      stickers: [
        { id: "7", name: "Sun", emoji: "☀️", isUnlocked: true },
        {
          id: "8",
          name: "Rainbow",
          emoji: "🌈",
          isUnlocked: true,
          isNew: true,
        },
        { id: "9", name: "Flower", emoji: "🌸", isUnlocked: true },
        { id: "10", name: "Tree", emoji: "🌳", isUnlocked: false },
        { id: "11", name: "Star", emoji: "⭐", isUnlocked: false },
        { id: "12", name: "Moon", emoji: "🌙", isUnlocked: false },
      ],
    },
    {
      id: "food",
      name: "Food",
      stickers: [
        { id: "13", name: "Cookie", emoji: "🍪", isUnlocked: true },
        { id: "14", name: "Cake", emoji: "🎂", isUnlocked: true },
        { id: "15", name: "Ice Cream", emoji: "🍦", isUnlocked: false },
        { id: "16", name: "Pizza", emoji: "🍕", isUnlocked: false },
        { id: "17", name: "Apple", emoji: "🍎", isUnlocked: false },
        { id: "18", name: "Candy", emoji: "🍬", isUnlocked: false },
      ],
    },
  ];

  const totalStickers = stickerCategories.reduce(
    (acc, cat) => acc + cat.stickers.length,
    0,
  );
  const unlockedStickers = stickerCategories.reduce(
    (acc, cat) => acc + cat.stickers.filter((s) => s.isUnlocked).length,
    0,
  );

  const handleStickerPress = (sticker: Sticker) => {
    // Will navigate to sticker detail or show sticker preview
    console.log("Sticker pressed:", sticker.name);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <AppHeader
          credits={50}
          challengeProgress={40}
          stickerCount={unlockedStickers}
          profileName="Artist"
          coloStage={1}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sticker Collection</Text>
            <View style={styles.collectionProgress}>
              <FontAwesomeIcon icon={faStar} size={16} color="#F59E0B" />
              <Text style={styles.collectionText}>
                {unlockedStickers} / {totalStickers} collected
              </Text>
            </View>
          </View>

          {/* Sticker Categories */}
          {stickerCategories.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <View style={styles.stickersGrid}>
                {category.stickers.map((sticker) => (
                  <StickerItem
                    key={sticker.id}
                    sticker={sticker}
                    onPress={() => handleStickerPress(sticker)}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* Unlock Hint */}
          <View style={styles.hintContainer}>
            <FontAwesomeIcon icon={faCheck} size={14} color="#10B981" />
            <Text style={styles.hintText}>
              Complete challenges to unlock more stickers!
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
    marginBottom: 8,
  },
  collectionProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  collectionText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 18,
    color: "#374151",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stickersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  stickerItem: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  stickerItemLocked: {
    opacity: 0.5,
  },
  stickerItemPressed: {
    transform: [{ scale: 0.95 }],
  },
  stickerEmoji: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerEmojiText: {
    fontSize: 40,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 8,
  },
  newBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#E46444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    marginTop: 8,
  },
  hintText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#6B7280",
  },
});

export default StickersScreen;
