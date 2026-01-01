import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faUser,
  faPlus,
  faCheck,
  faPencil,
  faTrash,
  faXmark,
} from "@fortawesome/pro-solid-svg-icons";
import {
  useProfiles,
  useActiveProfile,
  useSetActiveProfile,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
} from "@/hooks/api/useProfiles";
import type { Profile } from "@/api";

type ProfileSwitcherProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MAX_PROFILES = 5;

const ProfileSwitcher = ({ isOpen, onClose }: ProfileSwitcherProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const { data: profilesData, isLoading: profilesLoading } = useProfiles();
  const { data: activeProfileData } = useActiveProfile();
  const setActiveProfile = useSetActiveProfile();
  const createProfile = useCreateProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const profiles = profilesData?.profiles || [];
  const activeProfile = activeProfileData?.activeProfile;

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [editProfileName, setEditProfileName] = useState("");

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
        // Reset state when closing
        setIsEditing(false);
        setIsCreating(false);
        setEditingProfileId(null);
        setNewProfileName("");
        setEditProfileName("");
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleSelectProfile = async (profile: Profile) => {
    if (profile.id === activeProfile?.id) return;

    try {
      await setActiveProfile.mutateAsync(profile.id);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to switch profile. Please try again.");
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert("Error", "Please enter a profile name.");
      return;
    }

    try {
      await createProfile.mutateAsync({ name: newProfileName.trim() });
      setNewProfileName("");
      setIsCreating(false);
    } catch {
      Alert.alert("Error", "Failed to create profile. Please try again.");
    }
  };

  const handleStartEdit = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditProfileName(profile.name);
  };

  const handleSaveEdit = async () => {
    if (!editingProfileId || !editProfileName.trim()) return;

    try {
      await updateProfileMutation.mutateAsync({
        profileId: editingProfileId,
        input: { name: editProfileName.trim() },
      });
      setEditingProfileId(null);
      setEditProfileName("");
    } catch {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
    setEditProfileName("");
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profiles.length <= 1) {
      Alert.alert("Cannot Delete", "You must have at least one profile.");
      return;
    }

    Alert.alert(
      "Delete Profile",
      `Are you sure you want to delete "${profile.name}"? This will also delete all their saved artwork.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfileMutation.mutateAsync(profile.id);
            } catch {
              Alert.alert("Error", "Failed to delete profile. Please try again.");
            }
          },
        },
      ],
    );
  };

  // Control bottom sheet visibility
  React.useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const canAddProfile = profiles.length < MAX_PROFILES;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profiles</Text>
        <Pressable
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "Done" : "Edit"}
          </Text>
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {profilesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E46444" />
          </View>
        ) : (
          <>
            {/* Profile List */}
            {profiles.map((profile) => (
              <View key={profile.id} style={styles.profileRow}>
                {editingProfileId === profile.id ? (
                  // Edit mode for this profile
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editProfileName}
                      onChangeText={setEditProfileName}
                      placeholder="Profile name"
                      placeholderTextColor="#9CA3AF"
                      autoFocus
                      maxLength={20}
                    />
                    <Pressable
                      style={styles.editActionButton}
                      onPress={handleSaveEdit}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <ActivityIndicator size="small" color="#22C55E" />
                      ) : (
                        <FontAwesomeIcon icon={faCheck} size={18} color="#22C55E" />
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.editActionButton}
                      onPress={handleCancelEdit}
                    >
                      <FontAwesomeIcon icon={faXmark} size={18} color="#9CA3AF" />
                    </Pressable>
                  </View>
                ) : (
                  // Normal profile row
                  <Pressable
                    style={[
                      styles.profileItem,
                      profile.id === activeProfile?.id && styles.profileItemActive,
                    ]}
                    onPress={() => !isEditing && handleSelectProfile(profile)}
                    disabled={isEditing}
                  >
                    <View
                      style={[
                        styles.avatarContainer,
                        profile.id === activeProfile?.id && styles.avatarContainerActive,
                      ]}
                    >
                      <FontAwesomeIcon
                        icon={faUser}
                        size={20}
                        color={profile.id === activeProfile?.id ? "#FFFFFF" : "#E46444"}
                      />
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>{profile.name}</Text>
                      <Text style={styles.profileMeta}>
                        {profile.artworkCount} artwork{profile.artworkCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {profile.id === activeProfile?.id && !isEditing && (
                      <View style={styles.activeIndicator}>
                        <FontAwesomeIcon icon={faCheck} size={16} color="#22C55E" />
                      </View>
                    )}
                    {isEditing && (
                      <View style={styles.editActions}>
                        <Pressable
                          style={styles.editActionButton}
                          onPress={() => handleStartEdit(profile)}
                        >
                          <FontAwesomeIcon icon={faPencil} size={16} color="#6B7280" />
                        </Pressable>
                        {!profile.isDefault && (
                          <Pressable
                            style={styles.editActionButton}
                            onPress={() => handleDeleteProfile(profile)}
                            disabled={deleteProfileMutation.isPending}
                          >
                            {deleteProfileMutation.isPending ? (
                              <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                              <FontAwesomeIcon icon={faTrash} size={16} color="#EF4444" />
                            )}
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            ))}

            {/* Add Profile Section */}
            {isCreating ? (
              <View style={styles.createRow}>
                <View style={styles.avatarContainerNew}>
                  <FontAwesomeIcon icon={faPlus} size={20} color="#9CA3AF" />
                </View>
                <TextInput
                  style={styles.createInput}
                  value={newProfileName}
                  onChangeText={setNewProfileName}
                  placeholder="Enter name"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  maxLength={20}
                />
                <Pressable
                  style={[
                    styles.createButton,
                    (!newProfileName.trim() || createProfile.isPending) &&
                      styles.createButtonDisabled,
                  ]}
                  onPress={handleCreateProfile}
                  disabled={!newProfileName.trim() || createProfile.isPending}
                >
                  {createProfile.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.createButtonText}>Add</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsCreating(false);
                    setNewProfileName("");
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} size={18} color="#9CA3AF" />
                </Pressable>
              </View>
            ) : canAddProfile ? (
              <Pressable
                style={styles.addProfileButton}
                onPress={() => setIsCreating(true)}
              >
                <View style={styles.avatarContainerNew}>
                  <FontAwesomeIcon icon={faPlus} size={20} color="#9CA3AF" />
                </View>
                <Text style={styles.addProfileText}>Add Profile</Text>
              </Pressable>
            ) : (
              <View style={styles.maxProfilesNote}>
                <Text style={styles.maxProfilesText}>
                  Maximum of {MAX_PROFILES} profiles reached
                </Text>
              </View>
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FDFAF5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#D1D5DB",
    width: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 20,
    color: "#374151",
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#E46444",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  profileRow: {
    marginBottom: 8,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileItemActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E46444",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(228, 100, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarContainerActive: {
    backgroundColor: "#E46444",
  },
  avatarContainerNew: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 17,
    color: "#374151",
    marginBottom: 2,
  },
  profileMeta: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 13,
    color: "#9CA3AF",
  },
  activeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  editActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: "#E46444",
  },
  editInput: {
    flex: 1,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginTop: 4,
  },
  addProfileText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 16,
    color: "#9CA3AF",
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#E46444",
  },
  createInput: {
    flex: 1,
    fontFamily: "TondoTrial-Regular",
    fontSize: 16,
    color: "#374151",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  createButton: {
    backgroundColor: "#E46444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontFamily: "TondoTrial-Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  cancelButton: {
    padding: 8,
    marginLeft: 4,
  },
  maxProfilesNote: {
    padding: 16,
    alignItems: "center",
  },
  maxProfilesText: {
    fontFamily: "TondoTrial-Regular",
    fontSize: 14,
    color: "#9CA3AF",
  },
});

export default ProfileSwitcher;
