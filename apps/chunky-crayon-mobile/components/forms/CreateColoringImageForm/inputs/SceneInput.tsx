import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import {
  buildSceneDescription,
  rollRandomScene,
  type ScenePicks,
} from "@one-colored-pixel/coloring-core/scene";
import SceneBuilder, {
  type SceneLayer,
  type SceneSelection,
} from "@/components/SceneBuilder";
import { useT } from "@/lib/i18n/useT";
import { resolveR2Url } from "@/lib/r2-url";
import {
  SUBJECT_OPTIONS,
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
  MAX_SUBJECTS,
  type SubjectKey,
  type LocationKey,
  type WeatherKey,
  type ActivityKey,
  type AccentKey,
} from "@/lib/scene/scene-catalog";
import { useInputMode } from "./InputModeContext";

/**
 * App-side adapter that drives the shared <SceneBuilder/> from the mobile
 * `lib/scene` catalogue + i18n, and reports the built description up to
 * the create form via InputModeContext.
 *
 * Mirror of web's SceneInput, minus the character mix-in: Characters
 * isn't a mobile feature yet, so the `your-character` sentinel + locked-
 * tile logic are dropped. When Characters lands on mobile, re-introduce
 * the sentinel filter + lockedKeys here (the SceneBuilder already supports
 * the lockedKeys / onLockedTap / state:"add" props).
 *
 * The shared SceneBuilder is catalogue-agnostic — this adapter is where
 * CC mobile's catalogue, translations, and dice live.
 */

type SceneInputProps = {
  /** The wizard owns its own "Create!" button; this fires the form submit. */
  onCreate: () => void;
  /** Restore an interrupted selection (e.g. after a paywall). */
  initialSelection?: SceneSelection;
};

const SceneInput = ({ onCreate, initialSelection }: SceneInputProps) => {
  const t = useT("createForm.scene");
  const { setDescription } = useInputMode();
  const [selection, setSelection] = useState<SceneSelection>(
    initialSelection ?? {},
  );

  const layers = useMemo<SceneLayer[]>(() => {
    const toTile = (o: {
      key: string;
      label: string;
      icon: SceneLayer["options"][number]["icon"];
      duotone: SceneLayer["options"][number]["duotone"];
      thumbnailKey: string | null;
    }) => ({
      key: o.key,
      label: o.label,
      icon: o.icon,
      duotone: o.duotone,
      thumbnailUrl: resolveR2Url(o.thumbnailKey),
    });

    return [
      {
        id: "subject",
        title: t("subjectTitle"),
        kind: "multi",
        maxSelections: MAX_SUBJECTS,
        // No Characters on mobile → drop the `your-character` sentinel.
        options: SUBJECT_OPTIONS.filter((o) => o.key !== "your-character").map(
          (o) => toTile({ ...o, label: t(`subject.${o.key}`) }),
        ),
      },
      {
        id: "location",
        title: t("locationTitle"),
        kind: "single",
        options: LOCATION_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`location.${o.key}`) }),
        ),
      },
      {
        id: "weather",
        title: t("weatherTitle"),
        kind: "single",
        options: WEATHER_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`weather.${o.key}`) }),
        ),
      },
      {
        id: "activity",
        title: t("activityTitle"),
        kind: "single",
        options: ACTIVITY_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`activity.${o.key}`) }),
        ),
      },
      {
        id: "accent",
        title: t("accentTitle"),
        kind: "single",
        options: ACCENT_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`accent.${o.key}`) }),
        ),
      },
    ];
  }, [t]);

  // Derive description from picks and mirror it into InputModeContext —
  // that's what flips `isReady`. Required layers: ≥1 subject AND location.
  const setDescriptionRef = useRef(setDescription);
  setDescriptionRef.current = setDescription;
  useEffect(() => {
    const subjects = (selection.subject ?? []) as SubjectKey[];
    const picks: ScenePicks = {
      subjects,
      location: ((selection.location ?? [])[0] as LocationKey) ?? null,
      weather: ((selection.weather ?? [])[0] as WeatherKey) ?? null,
      activity: ((selection.activity ?? [])[0] as ActivityKey) ?? null,
      accent: ((selection.accent ?? [])[0] as AccentKey) ?? null,
    };

    const ready = subjects.length > 0 && Boolean(picks.location);
    setDescriptionRef.current(ready ? buildSceneDescription(picks) : "");
  }, [selection]);

  const handleSurpriseMe = () => {
    const rolled = rollRandomScene();
    setSelection({
      subject: rolled.subjects,
      location: [rolled.location],
      weather: rolled.weather ? [rolled.weather] : [],
      activity: rolled.activity ? [rolled.activity] : [],
      accent: rolled.accent ? [rolled.accent] : [],
    });
  };

  return (
    <View>
      <SceneBuilder
        layers={layers}
        selection={selection}
        onSelectionChange={setSelection}
        onSurpriseMe={handleSurpriseMe}
        onCreate={onCreate}
        labels={{
          ariaLabel: t("ariaLabel"),
          surpriseMe: t("surpriseMe"),
          back: t("back"),
          next: t("next"),
          create: t("create"),
          extrasTitle: t("extrasTitle"),
          skip: t("skip"),
        }}
      />
    </View>
  );
};

export default SceneInput;
