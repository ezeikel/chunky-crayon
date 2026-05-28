import { View, ScrollView } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import {
  InputModeProvider,
  InputModeSelector,
  SceneInput,
  TextInputPanel,
  VoiceInputPanel,
  ImageInputPanel,
} from "./inputs";

/**
 * Mobile mirror of web's `Chunky Crayon/03 Forms & Actions →
 * CreateColoringPageFormDefault / InputModePieces / SceneInputStory /
 * TextInputStory / VoiceInputStory / ImageInputStory` stories.
 *
 * Mobile now has FOUR input modes, matching web: Scene (the privacy-
 * first DEFAULT) + Text / Voice / Image (parent-gated). The mode
 * selector renders all four scene-first with no lock badges; the parent
 * gate fires on tap of a locked mode.
 *
 * Stories:
 *   ModeSelector — the 4-tile mode row at the top of the form
 *   SceneInput   — the Scene Builder wizard (Who → Where → extras)
 *   TextInput    — paint-by-description input panel
 *   VoiceInput   — record-your-voice input panel
 *   ImageInput   — pick-a-photo input panel
 *
 * The form's submit handlers call the real `createColoringImage` API
 * on the production path. The story shells stub those out with
 * action() spies so taps don't fire a real network request.
 *
 * Each panel needs to live inside InputModeProvider — the mode selector
 * + active panel + 'reset on submit' all share state through context.
 * The decorator wraps every story below. The selector reads unlocked
 * modes via React Query (preview provides the client; the fetch fails
 * offline and falls back to "Scene only", the correct locked default).
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
  name: "Input Modes — Selector",
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
    </Stage>
  ),
};

export const SceneInputStory: Story = {
  name: "Input — Scene Builder",
  render: () => (
    <Stage>
      <InputModeSelector disabled={false} />
      <View style={{ marginTop: 16 }}>
        <SceneInput onCreate={action("create")} />
      </View>
    </Stage>
  ),
};

export const TextInput: Story = {
  name: "Input — Text",
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
  name: "Input — Text (submitting)",
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
  name: "Input — Voice",
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
  name: "Input — Voice (no credits)",
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
  name: "Input — Image",
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
  name: "Input — Image (no credits)",
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
