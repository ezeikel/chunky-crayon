import { View, ScrollView } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import {
  InputModeProvider,
  InputModeSelector,
  TextInputPanel,
  VoiceInputPanel,
  ImageInputPanel,
} from "./inputs";

/**
 * Mobile mirror of web's `Chunky Crayon/03 Forms & Actions →
 * CreateColoringPageFormDefault / InputModePieces / TextInputStory /
 * VoiceInputStory / ImageInputStory` stories.
 *
 * Mobile has THREE input modes today (Text / Voice / Image). Web has
 * a fourth (Scene) — flagged in ~/.claude/plans/mobile-storybook-
 * coverage-map.md as a missing surface. Not building Scene here; that
 * lands when the SceneInputPanel component does.
 *
 * Stories:
 *   ModeSelector — just the tabs row at the top of the form
 *   TextInput    — paint-by-description input panel
 *   VoiceInput   — record-your-voice input panel
 *   ImageInput   — pick-a-photo input panel
 *   Assembled    — the full form with the mode selector + active panel
 *
 * The form's submit handlers call the real `createColoringImage` API
 * on the production path. The story shells stub those out with
 * action() spies so taps don't fire a real network request.
 *
 * Each panel needs to live inside InputModeProvider — the mode selector
 * + active panel + 'reset on submit' all share state through context.
 * The decorator wraps every story below.
 */

const Stage = ({ children }: { children: React.ReactNode }) => (
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      backgroundColor: "#FDFAF5",
      padding: 16,
    }}
  >
    <InputModeProvider>
      <View style={{ alignSelf: "stretch" }}>{children}</View>
    </InputModeProvider>
  </ScrollView>
);

const meta: Meta = {
  title: "Forms & Actions/CreateColoringImageForm",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const ModeSelector: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
    </Stage>
  ),
};

export const TextInput: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <TextInputPanel onSubmit={action("submit")} isSubmitting={false} />
      </View>
    </Stage>
  ),
};

export const TextInputSubmitting: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled />
      <View style={{ marginTop: 16 }}>
        <TextInputPanel onSubmit={action("submit")} isSubmitting />
      </View>
    </Stage>
  ),
};

export const VoiceInput: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <VoiceInputPanel
          onSubmit={action("submit")}
          isSubmitting={false}
          credits={250}
          onShowPaywall={action("show-paywall")}
        />
      </View>
    </Stage>
  ),
};

export const VoiceInputNoCredits: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <VoiceInputPanel
          onSubmit={action("submit")}
          isSubmitting={false}
          credits={0}
          onShowPaywall={action("show-paywall")}
        />
      </View>
    </Stage>
  ),
};

export const ImageInput: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <ImageInputPanel
          onColoringImageCreated={action("image-created")}
          isSubmitting={false}
          credits={250}
          onShowPaywall={action("show-paywall")}
        />
      </View>
    </Stage>
  ),
};

export const ImageInputNoCredits: Story = {
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <ImageInputPanel
          onColoringImageCreated={action("image-created")}
          isSubmitting={false}
          credits={0}
          onShowPaywall={action("show-paywall")}
        />
      </View>
    </Stage>
  ),
};
