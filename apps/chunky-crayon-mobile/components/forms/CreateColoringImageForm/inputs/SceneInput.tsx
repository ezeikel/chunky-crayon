import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { faUser, faUserPlus } from "@fortawesome/pro-duotone-svg-icons";
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
 * Mirror of web's SceneInput, including the character mix-in: the kid's
 * saved characters render as a separate "Your friends" row of COLOUR-portrait
 * discs (plus an add-friend tile that routes to /characters). Friends share
 * the MAX_SUBJECTS=2 cap with the preset subjects, so any mix of up to two
 * works (two friends, two presets, or one of each). The picked characters'
 * ids are reported up via onCharactersChange so the form threads them into
 * the create call, and their names go into the scene description.
 *
 * The shared SceneBuilder is catalogue-agnostic — this adapter is where
 * CC mobile's catalogue, translations, dice, and characters live.
 */

type SceneInputProps = {
  /** The wizard owns its own "Create!" button; this fires the form submit. */
  onCreate: () => void;
  /** Reports the kid's picked characters (up to MAX_SUBJECTS) up to the form
   *  so they get threaded into the create call. */
  onCharactersChange?: (characterIds: string[]) => void;
  /**
   * When true, the wizard's Create button stays inviting but tap fires
   * `onCreateBlockedTap` (opens the paywall) instead of `onCreate` —
   * surfaces the paywall at the moment of Create rather than letting the
   * kid build the whole scene then bounce off it on submit. Mirrors web.
   */
  createBlocked?: boolean;
  /** Fired when the kid taps the blocked Create button. */
  onCreateBlockedTap?: () => void;
  /** Restore an interrupted selection (e.g. after a paywall). */
  initialSelection?: SceneSelection;
};

const SceneInput = ({
  onCreate,
  onCharactersChange,
  createBlocked = false,
  onCreateBlockedTap,
  initialSelection,
}: SceneInputProps) => {
  const t = useT("createForm.scene");
  const { setDescription } = useInputMode();
  const { data: charactersData } = useCharacters();
  const [selection, setSelection] = useState<SceneSelection>(
    initialSelection ?? {},
  );

  // The kid's READY characters — each a selectable "friend" disc in its own
  // row, sharing the MAX_SUBJECTS cap with presets (any mix of up to two).
  const readyCharacters = useMemo(
    () =>
      (charactersData?.characters ?? []).filter((c) => c.status === "READY"),
    [charactersData],
  );
  // Map a friend option key (`char:<id>`) back to the character.
  const characterByOptionKey = useMemo(
    () => new Map(readyCharacters.map((c) => [`char:${c.id}`, c])),
    [readyCharacters],
  );

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

    // Friend group — one disc per READY character showing its COLOUR portrait,
    // plus an add-friend tile. Replaces the old single `your-character`
    // sentinel (which rendered a star).
    const friendDuotone = { primary: "#C18B9D", secondary: "#E68991" };
    const friendOptions: SceneLayer["options"] = [
      ...readyCharacters.map((c) => ({
        key: `char:${c.id}`,
        label: c.name,
        icon: faUser,
        duotone: friendDuotone,
        // COLOUR portrait — line art is only the generation reference.
        thumbnail: c.portraitUrl
          ? { uri: c.portraitUrl }
          : c.portraitLineArtUrl
            ? { uri: c.portraitLineArtUrl }
            : null,
        group: "friends" as const,
      })),
      {
        key: "add-friend",
        label: t("subjectAddCharacter"),
        icon: faUserPlus,
        duotone: friendDuotone,
        thumbnail: null,
        group: "friends" as const,
        state: "add" as const,
      },
    ];

    // Preset subjects — drop the legacy `your-character` sentinel.
    const presetOptions = SUBJECT_OPTIONS.filter(
      (o) => o.key !== "your-character",
    ).map((o) => toTile({ ...o, label: t(`subject.${o.key}`) }));

    return [
      {
        id: "subject",
        title: t("subjectTitle"),
        kind: "multi",
        maxSelections: MAX_SUBJECTS,
        options: [...friendOptions, ...presetOptions],
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
  }, [t, readyCharacters]);

  // The add-friend tile routes to /characters instead of selecting, so it's
  // marked "locked" (SceneBuilder fires onLockedTap for locked tiles). The
  // saved-character discs stay normal selectable tiles.
  const lockedKeys = useMemo(() => ({ subject: ["add-friend"] }), []);

  // Derive description + characterIds from picks. The description is mirrored
  // into InputModeContext (flips `isReady`); the characterIds are reported up
  // to the form so they get threaded into the create call.
  const setDescriptionRef = useRef(setDescription);
  setDescriptionRef.current = setDescription;
  const onCharactersChangeRef = useRef(onCharactersChange);
  onCharactersChangeRef.current = onCharactersChange;
  useEffect(() => {
    const rawSubjects = selection.subject ?? [];
    const presetSubjects = rawSubjects.filter(
      (s) => !s.startsWith("char:") && s !== "add-friend",
    ) as SubjectKey[];
    const pickedCharacters = rawSubjects
      .map((s) => characterByOptionKey.get(s))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const picks: ScenePicks = {
      subjects: presetSubjects,
      location: ((selection.location ?? [])[0] as LocationKey) ?? null,
      weather: ((selection.weather ?? [])[0] as WeatherKey) ?? null,
      activity: ((selection.activity ?? [])[0] as ActivityKey) ?? null,
      accent: ((selection.accent ?? [])[0] as AccentKey) ?? null,
      characterNames: pickedCharacters.map((c) => c.name),
    };

    const realSubjectCount = presetSubjects.length + pickedCharacters.length;
    const ready = realSubjectCount > 0 && Boolean(picks.location);
    setDescriptionRef.current(ready ? buildSceneDescription(picks) : "");
    onCharactersChangeRef.current?.(pickedCharacters.map((c) => c.id));
  }, [selection, characterByOptionKey]);

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

  // The add-friend tile routes to character creation rather than selecting.
  const handleLockedTap = (_layerId: string, optionKey: string) => {
    if (optionKey === "add-friend") {
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
        createBlocked={createBlocked}
        onCreateBlockedTap={onCreateBlockedTap}
        lockedKeys={lockedKeys}
        onLockedTap={handleLockedTap}
        labels={{
          ariaLabel: t("ariaLabel"),
          surpriseMe: t("surpriseMe"),
          lockedSuffix: t("lockedMakeCharacter"),
          back: t("back"),
          next: t("next"),
          create: t("create"),
          extrasTitle: t("extrasTitle"),
          skip: t("skip"),
          friendsTitle: t("friendsTitle"),
          subjectGroupTitle: t("subjectGroupTitle"),
        }}
      />
    </View>
  );
};

export default SceneInput;
