import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "@/components/Toaster";
import ConfirmSheet from "@/components/ConfirmSheet";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faPlus,
  faCheck,
  faPencil,
  faTrash,
  faXmark,
} from "@fortawesome/pro-solid-svg-icons";
import ProfileAvatar from "@/components/ProfileAvatar";
import CreateProfileCard from "@/components/CreateProfileCard";
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
  const insets = useSafeAreaInsets();

  const { data: profilesData, isLoading: profilesLoading } = useProfiles();
  const { data: activeProfileData } = useActiveProfile();
  const setActiveProfile = useSetActiveProfile();
  const createProfile = useCreateProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const profiles = profilesData?.profiles || [];
  const activeProfile = activeProfileData?.activeProfile;

  // UI state. Create-card name + avatarId state now lives inside
  // CreateProfileCard; this component only tracks whether the create
  // card is mounted at all.
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState("");

  // Delete-profile confirm sheet
  const [deleteTargetProfile, setDeleteTargetProfile] =
    useState<Profile | null>(null);

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === 0) {
        onClose();
        // Reset state when closing.
        setIsEditing(false);
        setIsCreating(false);
        setEditingProfileId(null);
        setEditProfileName("");
      }
    },
    [onClose],
  );

  const handleSelectProfile = async (profile: Profile) => {
    if (profile.id === activeProfile?.id) return;

    try {
      await setActiveProfile.mutateAsync(profile.id);
      onClose();
    } catch {
      toast.error("Couldn't switch profile. Please try again.");
    }
  };

  const handleCreateProfile = async (input: {
    name: string;
    avatarId: string;
  }) => {
    try {
      await createProfile.mutateAsync(input);
      setIsCreating(false);
    } catch {
      toast.error("Couldn't create profile. Please try again.");
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
      toast.error("Couldn't update profile. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
    setEditProfileName("");
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profiles.length <= 1) {
      toast.error("You must have at least one profile.");
      return;
    }
    setDeleteTargetProfile(profile);
  };

  const confirmDeleteProfile = async () => {
    if (!deleteTargetProfile) return;
    try {
      await deleteProfileMutation.mutateAsync(deleteTargetProfile.id);
    } catch {
      toast.error("Couldn't delete profile. Please try again.");
    } finally {
      setDeleteTargetProfile(null);
    }
  };

  const canAddProfile = profiles.length < MAX_PROFILES;

  return (
    <>
      <ModalBottomSheet
        index={isOpen ? 1 : 0}
        onIndexChange={handleIndexChange}
        detents={[0, "content"]}
        scrimColor="rgba(0, 0, 0, 0.5)"
      >
        <View style={styles.surface}>
          <View style={styles.handleIndicator} />
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

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
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
                            <FontAwesomeIcon
                              icon={faCheck}
                              size={18}
                              color="#22C55E"
                            />
                          )}
                        </Pressable>
                        <Pressable
                          style={styles.editActionButton}
                          onPress={handleCancelEdit}
                        >
                          <FontAwesomeIcon
                            icon={faXmark}
                            size={18}
                            color="#9CA3AF"
                          />
                        </Pressable>
                      </View>
                    ) : (
                      // Normal profile row
                      <Pressable
                        style={[
                          styles.profileItem,
                          profile.id === activeProfile?.id &&
                            styles.profileItemActive,
                        ]}
                        onPress={() =>
                          !isEditing && handleSelectProfile(profile)
                        }
                        disabled={isEditing}
                      >
                        <ProfileAvatar
                          avatarId={profile.avatarId}
                          name={profile.name}
                          size="md"
                          showBorder={profile.id === activeProfile?.id}
                        />
                        <View style={styles.profileInfo}>
                          <Text style={styles.profileName}>{profile.name}</Text>
                          <Text style={styles.profileMeta}>
                            {profile.artworkCount} artwork
                            {profile.artworkCount !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        {profile.id === activeProfile?.id && !isEditing && (
                          <View style={styles.activeIndicator}>
                            <FontAwesomeIcon
                              icon={faCheck}
                              size={16}
                              color="#22C55E"
                            />
                          </View>
                        )}
                        {isEditing && (
                          <View style={styles.editActions}>
                            <Pressable
                              style={styles.editActionButton}
                              onPress={() => handleStartEdit(profile)}
                            >
                              <FontAwesomeIcon
                                icon={faPencil}
                                size={16}
                                color="#6B7280"
                              />
                            </Pressable>
                            {!profile.isDefault && (
                              <Pressable
                                style={styles.editActionButton}
                                onPress={() => handleDeleteProfile(profile)}
                                disabled={deleteProfileMutation.isPending}
                              >
                                {deleteProfileMutation.isPending ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#EF4444"
                                  />
                                ) : (
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    size={16}
                                    color="#EF4444"
                                  />
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
                  <CreateProfileCard
                    isSubmitting={createProfile.isPending}
                    onCancel={() => setIsCreating(false)}
                    onSubmit={handleCreateProfile}
                  />
                ) : canAddProfile ? (
                  <Pressable
                    style={styles.addProfileButton}
                    onPress={() => setIsCreating(true)}
                  >
                    <View style={styles.avatarContainerNew}>
                      <FontAwesomeIcon
                        icon={faPlus}
                        size={20}
                        color="#9CA3AF"
                      />
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
          </ScrollView>
        </View>
      </ModalBottomSheet>

      <ConfirmSheet
        isOpen={deleteTargetProfile !== null}
        onClose={() => setDeleteTargetProfile(null)}
        title="Delete profile?"
        description={
          deleteTargetProfile
            ? `This will erase "${deleteTargetProfile.name}" and all their saved pictures.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteProfile}
        tone="destructive"
      />
    </>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#FDFAF5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  handleIndicator: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
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
