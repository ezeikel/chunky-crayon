import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Spinner from "@/components/Spinner/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";
import { faUserAstronaut } from "@fortawesome/pro-duotone-svg-icons";
import SectionHeader from "@/components/SectionHeader/SectionHeader";
import CharacterTile, { AddCharacterTile } from "@/components/CharacterTile";
import CharacterBuilder, {
  type CharacterDraft,
} from "@/components/CharacterBuilder";
import ParentalGate from "@/components/ParentalGate";
import { toast } from "@/components/Toaster";
import {
  useCharacters,
  useCreateCharacter,
  useDeleteCharacter,
  useRetryCharacter,
} from "@/hooks/api";
import type { Character } from "@/api";
import { useT } from "@/lib/i18n/useT";
import { COLORS, FONTS } from "@/lib/design";

const MAX_PER_PROFILE = 8;

/**
 * Characters roster — reached from the "My Characters" Home card (not a
 * tab; the bar is locked at 4 + FAB). RN port of web's /characters page.
 *
 *   0 characters  → oversized empty state + Make a Friend CTA
 *   1..cap        → 2-col grid of CharacterTiles + Add tile
 *   at cap        → grid + "full house" footer
 *
 * Add → full-screen CharacterBuilder modal (create → GENERATING tile →
 * worker → READY). Tapping a READY tile parent-gates a delete. FAILED
 * tiles retry on tap.
 */
const CharactersScreen = () => {
  const insets = useSafeAreaInsets();
  const t = useT("mobile.characters");
  const { data, isLoading } = useCharacters();
  const createCharacter = useCreateCharacter();
  const deleteCharacter = useDeleteCharacter();
  const retryCharacter = useRetryCharacter();

  const [builderOpen, setBuilderOpen] = useState(false);
  // Character pending delete — opening the gate; passing it deletes.
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  const characters = data?.characters ?? [];
  const atCap = characters.length >= MAX_PER_PROFILE;

  const handleCreate = (draft: CharacterDraft) => {
    createCharacter.mutate(draft, {
      onSuccess: (result) => {
        if (result.ok) {
          setBuilderOpen(false);
        } else {
          const friendly: Record<string, string> = {
            unauthorized: t("err.unauthorized"),
            no_active_profile: t("err.noProfile"),
            invalid_input: t("err.generic"),
            moderation_blocked: t("err.moderation"),
            limit_reached: t("err.limit"),
            worker_unavailable: t("err.worker"),
            unknown: t("err.generic"),
          };
          toast.error(friendly[result.error] ?? t("err.generic"));
        }
      },
      onError: () => toast.error(t("err.generic")),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    deleteCharacter.mutate(id, {
      onError: () => toast.error(t("err.deleteFailed")),
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        {isLoading ? (
          <View style={styles.center}>
            <Spinner size={40} />
            <Text style={styles.muted}>{t("loading")}</Text>
          </View>
        ) : characters.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <FontAwesomeIcon
                icon={faUserAstronaut}
                size={56}
                color={COLORS.crayonOrange}
                secondaryColor={COLORS.crayonOrangeLight}
                secondaryOpacity={1}
              />
            </View>
            <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("emptySubtitle")}</Text>
            <Pressable
              onPress={() => setBuilderOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("makeFriend")}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText}>{t("makeFriend")}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeader
              title={t("title")}
              icon={faUserAstronaut}
              tint="orange"
              subtitle={`${characters.length} / ${MAX_PER_PROFILE}`}
              style={styles.sectionHeader}
            />
            <View style={styles.grid}>
              {characters.map((c) => (
                <View key={c.id} style={styles.gridCell}>
                  <CharacterTile
                    character={c}
                    onPress={() => setDeleteTarget(c)}
                    onRetry={() => retryCharacter.mutate(c.id)}
                  />
                </View>
              ))}
              {!atCap && (
                <View style={styles.gridCell}>
                  <AddCharacterTile onPress={() => setBuilderOpen(true)} />
                </View>
              )}
            </View>
            {atCap && (
              <View style={styles.fullHousePill}>
                <FontAwesomeIcon
                  icon={faUserAstronaut}
                  size={16}
                  color={COLORS.crayonOrange}
                  secondaryColor={COLORS.secondaryOrange}
                  secondaryOpacity={1}
                />
                <Text style={styles.fullHouseText}>{t("fullHouse")}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </LinearGradient>

      {/* Create — full-screen builder modal. */}
      <Modal
        visible={builderOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBuilderOpen(false)}
      >
        <View style={styles.root}>
          <LinearGradient
            colors={["#FDFAF5", "#F5EEE5"]}
            style={styles.gradient}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
              <Text style={styles.modalTitle}>{t("newCharacter")}</Text>
              <Pressable
                onPress={() => setBuilderOpen(false)}
                accessibilityLabel={t("close")}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closePressed,
                ]}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={[
                styles.modalBody,
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <CharacterBuilder
                onSubmit={handleCreate}
                submitting={createCharacter.isPending}
              />
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      {/* Delete is parent-gated (web gates deleteCharacter). The gate opens
          on a READY-tile tap; passing it deletes. */}
      <ParentalGate
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onSuccess={confirmDelete}
        title={t("deleteTitle")}
        subtitle={t("deleteSubtitle")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  muted: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
  },
  // ── empty ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(228,100,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  cta: {
    backgroundColor: COLORS.crayonOrange,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.white,
  },
  // ── grid ──
  scroll: {
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCell: {
    width: "47.5%",
    flexGrow: 1,
  },
  // Content section header padding (the shared SectionHeader medallion).
  sectionHeader: {
    marginBottom: 16,
  },
  // "Full house" cap note as a soft cream pill, not a flat grey caption.
  fullHousePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.bgCreamDark,
  },
  fullHouseText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // ── builder modal ──
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: { opacity: 0.6 },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

export default CharactersScreen;
