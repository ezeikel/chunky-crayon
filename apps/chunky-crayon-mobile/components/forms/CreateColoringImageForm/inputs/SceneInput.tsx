import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  buildSceneDescription,
  rollRandomScene,
  type ScenePicks,
} from "@one-colored-pixel/coloring-core/scene";
import SceneBuilder, {
  type SceneLayer,
  type SceneSelection,
} from "@/components/SceneBuilder";
import { useCharacters } from "@/hooks/api";
import { useT } from "@/lib/i18n/useT";
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
 * Mirror of web's SceneInput, including the character mix-in: the
 * `your-character` subject is a sentinel. With a READY character it
 * renders as a normal tile labelled with the character's name and feeds
 * that name into the scene description (the image model draws the
 * character into the page). With no character yet it's an "add" tile,
 * locked, that routes to /characters. v1 is one-character-per-scene (the
 * first READY character), matching web + the server cap.
 *
 * The shared SceneBuilder is catalogue-agnostic — this adapter is where
 * CC mobile's catalogue, translations, dice, and characters live.
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
  const { data: charactersData } = useCharacters();
  const [selection, setSelection] = useState<SceneSelection>(
    initialSelection ?? {},
  );

  // First READY character is the one we mix in (one-per-scene in v1).
  const readyCharacter = useMemo(
    () =>
      (charactersData?.characters ?? []).find((c) => c.status === "READY") ??
      null,
    [charactersData],
  );
  const hasCharacter = Boolean(readyCharacter);

  const layers = useMemo<SceneLayer[]>(() => {
    const toTile = (o: {
      key: string;
      label: string;
      icon: SceneLayer["options"][number]["icon"];
      duotone: SceneLayer["options"][number]["duotone"];
      thumbnail: SceneLayer["options"][number]["thumbnail"];
    }) => ({
      key: o.key,
      label: o.label,
      icon: o.icon,
      duotone: o.duotone,
      // Bundled illustration PNG (require()'d in the catalogue), not a
      // runtime R2 URL — same pattern as profile avatars.
      thumbnail: o.thumbnail,
    });

    return [
      {
        id: "subject",
        title: t("subjectTitle"),
        kind: "multi",
        maxSelections: MAX_SUBJECTS,
        options: SUBJECT_OPTIONS.map((o) => {
          if (o.key === "your-character") {
            // READY character → normal tile labelled with their name.
            // No character yet → "add" tile (locked) that routes to
            // /characters via handleLockedTap.
            if (readyCharacter) {
              return toTile({ ...o, label: readyCharacter.name });
            }
            return {
              ...toTile({ ...o, label: t("subjectAddCharacter") }),
              state: "add" as const,
            };
          }
          return toTile({ ...o, label: t(`subject.${o.key}`) });
        }),
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
  }, [t, readyCharacter]);

  // Lock the `your-character` tile until there's a READY character to mix
  // in. With one, it's a normal selectable tile.
  const lockedKeys = useMemo(
    () => (hasCharacter ? undefined : { subject: ["your-character"] }),
    [hasCharacter],
  );

  // Derive description from picks and mirror it into InputModeContext —
  // that's what flips `isReady`. Required layers: ≥1 REAL subject AND
  // location. A lone `your-character` with no resolved name doesn't count
  // (buildSceneDescription drops it); the character's name is threaded in.
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
      characterName: readyCharacter?.name,
    };

    const realSubjectCount = subjects.filter(
      (s) => s !== "your-character" || hasCharacter,
    ).length;
    const ready = realSubjectCount > 0 && Boolean(picks.location);
    setDescriptionRef.current(ready ? buildSceneDescription(picks) : "");
  }, [selection, readyCharacter, hasCharacter]);

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

  // No character yet → send them to make one rather than dead-ending.
  const handleLockedTap = (_layerId: string, optionKey: string) => {
    if (optionKey === "your-character") {
      router.push("/characters");
    }
  };

  return (
    <View>
      <SceneBuilder
        layers={layers}
        selection={selection}
        onSelectionChange={setSelection}
        onSurpriseMe={handleSurpriseMe}
        onCreate={onCreate}
        lockedKeys={lockedKeys}
        onLockedTap={handleLockedTap}
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
