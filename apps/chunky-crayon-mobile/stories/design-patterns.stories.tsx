import { View, Text, ScrollView, TextInput, StyleSheet } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faXmark,
  faChevronRight,
  faStar,
} from "@fortawesome/pro-duotone-svg-icons";
import { COLORS, FONTS, SHADOWS } from "@/lib/design";
import Button from "@/components/Button";

/**
 * Mobile-side mirror of web's Design System catalog stories that have no
 * single owning component: SectionHeaders, ModalPatterns, and
 * FormsAndCards. These are reference contracts — the repeating layout
 * shapes screens reuse — built from `lib/design` tokens + the shared
 * Button. Touch a pattern here and the whole app should follow.
 *
 * Three stories, grouped under "Design System" to match web's sidebar.
 */

// ── Shared scaffolding ───────────────────────────────────────────────────────

const Stage = ({ children }: { children: React.ReactNode }) => (
  <ScrollView contentContainerStyle={styles.stage}>{children}</ScrollView>
);

const Caption = ({ children }: { children: string }) => (
  <Text style={styles.caption}>{children}</Text>
);

// ── SectionHeaders ───────────────────────────────────────────────────────────

const SectionHeaders = () => (
  <Stage>
    <Text style={styles.title}>Section Headers</Text>
    <Caption>
      The heading patterns screens repeat: a screen title, a titled section with
      a trailing action, and a section with a supporting subtitle.
    </Caption>

    {/* Screen title */}
    <View style={styles.block}>
      <Text style={styles.screenTitle}>Screen title</Text>
    </View>

    {/* Section + trailing action (the "See all" pattern) */}
    <View style={styles.block}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>My recent creations</Text>
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>See all</Text>
          <FontAwesomeIcon
            icon={faChevronRight}
            size={12}
            color={COLORS.crayonOrange}
          />
        </View>
      </View>
    </View>

    {/* Section + subtitle */}
    <View style={styles.block}>
      <Text style={styles.sectionHeading}>Pick a friend</Text>
      <Text style={styles.sectionSubtitle}>
        They&apos;ll star in your coloring pages.
      </Text>
    </View>
  </Stage>
);

// ── ModalPatterns ────────────────────────────────────────────────────────────

const ModalShell = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.modalCard}>
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <View style={styles.modalClose}>
        <FontAwesomeIcon icon={faXmark} size={16} color={COLORS.textMuted} />
      </View>
    </View>
    {children}
  </View>
);

const ModalPatterns = () => (
  <Stage>
    <Text style={styles.title}>Modal Patterns</Text>
    <Caption>
      The generic sheet/modal chrome: rounded card, title + close affordance,
      body, and a chunky primary action. New modals reuse this shell.
    </Caption>

    <ModalShell title="Remove this friend?">
      <Text style={styles.modalBody}>
        A grown-up check keeps this safe. This can&apos;t be undone.
      </Text>
      <View style={styles.modalActions}>
        <Button label="Cancel" variant="secondary" onPress={() => {}} />
        <Button label="Remove" variant="destructive" onPress={() => {}} />
      </View>
    </ModalShell>

    <ModalShell title="You're out of magic">
      <Text style={styles.modalBody}>
        Top up to keep making coloring pages.
      </Text>
      <View style={styles.modalActions}>
        <Button label="See plans" onPress={() => {}} />
      </View>
    </ModalShell>
  </Stage>
);

// ── FormsAndCards ────────────────────────────────────────────────────────────

const FormsAndCards = () => (
  <Stage>
    <Text style={styles.title}>Forms &amp; Cards</Text>
    <Caption>
      Field + card variants. Text field with label, a plain content card, and a
      selectable / highlighted card.
    </Caption>

    {/* Field */}
    <View style={styles.block}>
      <Text style={styles.fieldLabel}>Character name</Text>
      <TextInput style={styles.field} value="Rex the Brave" editable={false} />
    </View>

    {/* Plain card */}
    <View style={styles.contentCard}>
      <Text style={styles.cardTitle}>Plain card</Text>
      <Text style={styles.cardBody}>
        The default surface for grouped content — soft border, warm white.
      </Text>
    </View>

    {/* Highlighted / selectable card */}
    <View style={[styles.contentCard, styles.cardSelected]}>
      <View style={styles.cardSelectedRow}>
        <FontAwesomeIcon
          icon={faStar}
          size={20}
          color={COLORS.crayonOrange}
          secondaryColor={COLORS.yellow}
          secondaryOpacity={1}
        />
        <Text style={styles.cardTitle}>Selected card</Text>
      </View>
      <Text style={styles.cardBody}>
        Orange ring + tint marks the active choice, matching tile selection.
      </Text>
    </View>
  </Stage>
);

const styles = StyleSheet.create({
  stage: { padding: 20, backgroundColor: COLORS.bgCream, flexGrow: 1, gap: 16 },
  title: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.textPrimary },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  block: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
  },
  screenTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.crayonOrange,
  },
  // Modal
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgCream,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  // Forms
  fieldLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  field: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bgCream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
    padding: 16,
    gap: 6,
  },
  cardSelected: {
    borderColor: COLORS.crayonOrange,
    backgroundColor: COLORS.crayonPeachLight,
  },
  cardSelectedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  cardBody: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

const meta: Meta = {
  title: "Design System/Patterns",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Section_Headers: Story = { render: () => <SectionHeaders /> };
export const Modal_Patterns: Story = { render: () => <ModalPatterns /> };
export const Forms_And_Cards: Story = { render: () => <FormsAndCards /> };
