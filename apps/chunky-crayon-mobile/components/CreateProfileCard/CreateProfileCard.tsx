import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import ProfileAvatar from "@/components/ProfileAvatar";
import AvatarPicker from "@/components/AvatarPicker";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";

/**
 * Kid-friendly create-profile card. Extracted from ProfileSwitcher's
 * inline `isCreating ? …` block so the create flow has a clear
 * boundary, can be Storybook-tested in isolation, and (one day)
 * promoted into its own modal/screen without surgery on the switcher.
 *
 * Inputs are controlled by the caller — the card itself owns the
 * `name` + `avatarId` state and surfaces them through `onSubmit`
 * when the kid taps Create. Validation: Create stays disabled until
 * a non-empty trimmed name is entered.
 *
 * Mirrors web's CreateProfileModal in shape: live avatar preview at
 * top, 4×3 picker grid, name input, Cancel + Create actions row.
 */

type CreateProfileCardProps = {
  /** Fires when Cancel is tapped (parent dismisses the card). */
  onCancel: () => void;
  /** Fires when Create is tapped + a non-empty name is entered. */
  onSubmit: (input: { name: string; avatarId: string }) => void;
  /** True while the parent mutation is in-flight; disables Create + shows spinner. */
  isSubmitting?: boolean;
  /** Pre-seeded initial values (default: empty name + DEFAULT_AVATAR_ID). */
  initialName?: string;
  initialAvatarId?: string;
};

const CreateProfileCard = ({
  onCancel,
  onSubmit,
  isSubmitting = false,
  initialName = "",
  initialAvatarId = DEFAULT_AVATAR_ID,
}: CreateProfileCardProps) => {
  const [name, setName] = useState(initialName);
  const [avatarId, setAvatarId] = useState(initialAvatarId);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  return (
    <View style={styles.card}>
      {/* Live avatar preview — updates as the kid taps grid tiles
          and types their name. ProfileAvatar gracefully falls back
          to initials when name is empty. */}
      <View style={styles.preview}>
        <ProfileAvatar
          avatarId={avatarId}
          name={trimmed || "?"}
          size="xl"
          showBorder
        />
        <Text style={styles.previewLabel}>Pick your character</Text>
      </View>

      <AvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} />

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="What's your name?"
        placeholderTextColor="#9CA3AF"
        autoFocus
        maxLength={20}
      />

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
          ]}
          onPress={() => {
            if (!canSubmit) return;
            onSubmit({ name: trimmed, avatarId });
          }}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Create</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#E46444",
    gap: 16,
  },
  preview: {
    alignItems: "center",
    gap: 8,
  },
  previewLabel: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#3D2C1E",
  },
  nameInput: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 18,
    color: "#374151",
    backgroundColor: "#FAF7F1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8DFD6",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EBE0",
  },
  cancelText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#7A6F66",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E46444",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default CreateProfileCard;
