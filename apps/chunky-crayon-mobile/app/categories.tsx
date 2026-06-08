import { View, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CategoryGrid from "@/components/CategoryGrid/CategoryGrid";

/**
 * "Browse by category" index — the full rich category-card grid. Reached from
 * the Gallery tab's "See all" (and anywhere else that wants the full taxonomy).
 * Header is configured in _layout.tsx.
 */
const CategoriesScreen = () => {
  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <CategoryGrid />
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  content: { paddingVertical: 16, paddingBottom: 40 },
});

export default CategoriesScreen;
