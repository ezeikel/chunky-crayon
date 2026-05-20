import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  faStar,
  faHorse,
  faDog,
  faCat,
  faDragon,
  faFish,
  faUmbrellaBeach,
  faTree,
  faMountain,
  faCity,
  faSun,
  faSnowflake,
  faMoon,
  faRainbow,
  faFutbol,
  faPersonSwimming,
  faKite,
  faCakeCandles,
  faRocket,
} from "@fortawesome/pro-duotone-svg-icons";
import SceneBuilder, {
  type SceneLayer,
  type SceneSelection,
} from "./SceneBuilder";

/**
 * SceneBuilder is presentational + controlled. These stories wrap it in a
 * tiny stateful host so the picker is fully interactive in Storybook
 * (tap tiles, watch caps enforce, roll the dice) without pulling in the
 * app's catalogue or server actions.
 *
 * Tiles use FA fallback icons here — the generated colourful thumbnails
 * land in the Phase 7 asset pipeline. This is deliberately the
 * pre-pipeline state so the fallback path is the thing under review.
 */

const d = (primary: string, secondary: string) => ({ primary, secondary });

const LAYERS: SceneLayer[] = [
  {
    id: "subject",
    title: "Who's in your picture?",
    kind: "multi",
    maxSelections: 3,
    options: [
      {
        key: "your-character",
        label: "My Character",
        icon: faStar,
        thumbnailUrl: null,
        duotone: d("#f5b301", "#ff7eb3"),
      },
      {
        key: "horse",
        label: "Horse",
        icon: faHorse,
        thumbnailUrl: null,
        duotone: d("#ff8a3d", "#ffd166"),
      },
      {
        key: "dog",
        label: "Dog",
        icon: faDog,
        thumbnailUrl: null,
        duotone: d("#ff8a3d", "#2bb3a3"),
      },
      {
        key: "cat",
        label: "Cat",
        icon: faCat,
        thumbnailUrl: null,
        duotone: d("#a06cd5", "#ff7eb3"),
      },
      {
        key: "dragon",
        label: "Dragon",
        icon: faDragon,
        thumbnailUrl: null,
        duotone: d("#3fa34d", "#2bb3a3"),
      },
      {
        key: "fish",
        label: "Fish",
        icon: faFish,
        thumbnailUrl: null,
        duotone: d("#2bb3a3", "#a06cd5"),
      },
    ],
  },
  {
    id: "location",
    title: "Where are they?",
    kind: "single",
    options: [
      {
        key: "beach",
        label: "Beach",
        icon: faUmbrellaBeach,
        thumbnailUrl: null,
        duotone: d("#ffd166", "#2bb3a3"),
      },
      {
        key: "forest",
        label: "Forest",
        icon: faTree,
        thumbnailUrl: null,
        duotone: d("#3fa34d", "#2bb3a3"),
      },
      {
        key: "mountains",
        label: "Mountains",
        icon: faMountain,
        thumbnailUrl: null,
        duotone: d("#a06cd5", "#2bb3a3"),
      },
      {
        key: "busy-street",
        label: "Busy Street",
        icon: faCity,
        thumbnailUrl: null,
        duotone: d("#ff8a3d", "#a06cd5"),
      },
    ],
  },
  {
    id: "weather",
    title: "What's the weather?",
    kind: "single",
    options: [
      {
        key: "sunny",
        label: "Sunny",
        icon: faSun,
        thumbnailUrl: null,
        duotone: d("#ffd166", "#ff8a3d"),
      },
      {
        key: "snowy",
        label: "Snowy",
        icon: faSnowflake,
        thumbnailUrl: null,
        duotone: d("#2bb3a3", "#a06cd5"),
      },
      {
        key: "night",
        label: "Night",
        icon: faMoon,
        thumbnailUrl: null,
        duotone: d("#a06cd5", "#ffd166"),
      },
      {
        key: "rainbow",
        label: "Rainbow",
        icon: faRainbow,
        thumbnailUrl: null,
        duotone: d("#ff7eb3", "#2bb3a3"),
      },
    ],
  },
  {
    id: "activity",
    title: "What are they doing?",
    kind: "single",
    options: [
      {
        key: "playing",
        label: "Playing",
        icon: faFutbol,
        thumbnailUrl: null,
        duotone: d("#3fa34d", "#ffd166"),
      },
      {
        key: "swimming",
        label: "Swimming",
        icon: faPersonSwimming,
        thumbnailUrl: null,
        duotone: d("#2bb3a3", "#a06cd5"),
      },
      {
        key: "flying-a-kite",
        label: "Kite",
        icon: faKite,
        thumbnailUrl: null,
        duotone: d("#ff7eb3", "#2bb3a3"),
      },
    ],
  },
  {
    id: "accent",
    title: "Add a little extra",
    kind: "single",
    options: [
      {
        key: "birthday",
        label: "Birthday",
        icon: faCakeCandles,
        thumbnailUrl: null,
        duotone: d("#ff7eb3", "#ffd166"),
      },
      {
        key: "sparkles",
        label: "Sparkles",
        icon: faStar,
        thumbnailUrl: null,
        duotone: d("#ffd166", "#ff7eb3"),
      },
      {
        key: "space-stars",
        label: "Stars",
        icon: faRocket,
        thumbnailUrl: null,
        duotone: d("#a06cd5", "#2bb3a3"),
      },
    ],
  },
];

const allKeys = (layerId: string) =>
  LAYERS.find((l) => l.id === layerId)?.options.map((o) => o.key) ?? [];

const rollDemoScene = (): SceneSelection => {
  const pick = (id: string) => {
    const keys = allKeys(id).filter((k) => k !== "your-character");
    return [keys[Math.floor(Math.random() * keys.length)]];
  };
  return {
    subject: pick("subject"),
    location: pick("location"),
    weather: Math.random() < 0.6 ? pick("weather") : [],
    activity: Math.random() < 0.6 ? pick("activity") : [],
    accent: Math.random() < 0.6 ? pick("accent") : [],
  };
};

type HostProps = {
  initial?: SceneSelection;
  withDice?: boolean;
  lockCharacter?: boolean;
  disabled?: boolean;
};

const SceneBuilderHost = ({
  initial = {},
  withDice = true,
  lockCharacter = false,
  disabled = false,
}: HostProps) => {
  const [selection, setSelection] = useState<SceneSelection>(initial);
  const [lockedTap, setLockedTap] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  return (
    <div style={{ maxWidth: 600 }}>
      <SceneBuilder
        layers={LAYERS}
        selection={selection}
        onSelectionChange={setSelection}
        onSurpriseMe={
          withDice ? () => setSelection(rollDemoScene()) : undefined
        }
        onCreate={() => setCreated(true)}
        lockedKeys={lockCharacter ? { subject: ["your-character"] } : undefined}
        onLockedTap={(layerId, optionKey) =>
          setLockedTap(`${layerId} / ${optionKey}`)
        }
        disabled={disabled}
        labels={{
          ariaLabel: "Build your picture",
          surpriseMe: "Surprise me!",
          lockedSuffix: "(make a character first)",
          back: "Back",
          next: "Next",
          create: "Create!",
          extrasTitle: "Make it special",
          skip: "Skip",
        }}
      />
      {created && (
        <p
          style={{
            marginTop: 12,
            color: "#3fa34d",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          onCreate fired ✓
        </p>
      )}
      {lockedTap && (
        <p
          style={{
            marginTop: 12,
            color: "#a06cd5",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          locked tap → {lockedTap}
        </p>
      )}
      <pre
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f6f6f6",
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        {JSON.stringify(selection, null, 2)}
      </pre>
    </div>
  );
};

const meta: Meta<typeof SceneBuilderHost> = {
  title: "Coloring/SceneBuilder",
  component: SceneBuilderHost,
};

export default meta;
type Story = StoryObj<typeof SceneBuilderHost>;

/** Nothing picked yet — the first thing a kid sees. */
export const Empty: Story = {};

/** A couple of rows chosen, optional rows still open. */
export const PartialSelection: Story = {
  args: {
    initial: { subject: ["dog"], location: ["beach"] },
  },
};

/** Every layer filled, including two subjects. */
export const FullSelection: Story = {
  args: {
    initial: {
      subject: ["dog", "cat"],
      location: ["forest"],
      weather: ["sunny"],
      activity: ["playing"],
      accent: ["sparkles"],
    },
  },
};

/** Saved character mixed into the scene alongside another subject. */
export const WithCharacterMixedIn: Story = {
  args: {
    initial: {
      subject: ["your-character", "dragon"],
      location: ["mountains"],
      weather: ["snowy"],
    },
  },
};

/** No saved character yet — the My Character tile is locked. */
export const CharacterLocked: Story = {
  args: {
    lockCharacter: true,
    initial: { subject: ["horse"], location: ["beach"] },
  },
};

/** Submitting / processing — whole picker inert. */
export const Disabled: Story = {
  args: {
    disabled: true,
    initial: {
      subject: ["dragon"],
      location: ["mountains"],
      activity: ["flying-a-kite"],
    },
  },
};

/** Dice hidden (e.g. if the app gates "surprise me"). */
export const WithoutDice: Story = {
  args: {
    withDice: false,
    initial: { subject: ["cat"], location: ["busy-street"] },
  },
};
