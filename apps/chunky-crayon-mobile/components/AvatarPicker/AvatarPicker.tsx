import { View, Text, Pressable, StyleSheet } from "react-native";
import ProfileAvatar from "@/components/ProfileAvatar";
import { AVATARS } from "@/lib/avatars";
import { selectionChanged } from "@/utils/haptics";

/**
 * 12-tile avatar picker grid. Pure presentational — caller owns
 * the selected state.
 *
 * Used in ProfileSwitcher's create-profile card; a future edit flow
 * (change avatar without renaming the profile) can drop this in too.
 *
 * Layout: 4 columns × 3 rows, tile width = 22% (≈ a quarter of the
 * grid width with breathing room). Selected tile shows the brand
 * coral ring matching the rest of CC's selection chrome.
 */

type AvatarPickerProps = {
  /** Currently selected avatar id. */
  selectedAvatarId: string;
  /** Called with the new id when the user taps a tile. */
  onSelect: (avatarId: string) => void;
};

const AvatarPicker = ({ selectedAvatarId, onSelect }: AvatarPickerProps) => {
  return (
    <View style={styles.grid}>
      {AVATARS.map((avatar) => {
        const isSelected = avatar.id === selectedAvatarId;
        return (
          <Pressable
            key={avatar.id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => {
              selectionChanged();
              onSelect(avatar.id);
            }}
            accessibilityLabel={`Pick ${avatar.name}`}
            accessibilityState={{ selected: isSelected }}
          >
            <ProfileAvatar avatarId={avatar.id} size="md" />
            <Text style={styles.label} numberOfLines={1}>
              {avatar.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  item: {
    // 4 columns; 22% leaves room for breathing room. Padding so the
    // selected ring sits outside the avatar, not on top of it.
    width: "22%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  itemSelected: {
    backgroundColor: "#FFF1EA",
    borderWidth: 3,
    borderColor: "#E46444",
  },
  label: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 11,
    color: "#3D2C1E",
    textAlign: "center",
  },
});

export default AvatarPicker;
