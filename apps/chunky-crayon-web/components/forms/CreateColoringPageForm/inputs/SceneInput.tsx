'use client';

/**
 * App-side adapter that drives the shared <SceneBuilder/> from the
 * `lib/scene` catalogue + i18n, and reports the built description up to
 * the create form.
 *
 * The shared component is catalogue-agnostic (same contract as
 * InputModeSelector's `labels`): coloring-ui never imports app data.
 * This adapter is where CC's catalogue, translations, character mix-in
 * and dice live, so CH can later supply its own adapter against the same
 * shared component.
 *
 * Character mix-in: the `your-character` subject is a sentinel. When the
 * kid has no READY character it renders LOCKED and the tap deep-links to
 * /characters (don't dead-end them). When they do, picking it threads the
 * character's display name into the description and the character's id
 * up to the form so the existing character-aware pipeline kicks in.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { faUser, faUserPlus } from '@fortawesome/pro-duotone-svg-icons';
import {
  SceneBuilder,
  type SceneLayer,
  type SceneSelection,
} from '@one-colored-pixel/coloring-ui';
import { useInputMode } from './InputModeContext';
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
} from '@/lib/scene/scene-catalog';
import {
  buildSceneDescription,
  type ScenePicks,
} from '@/lib/scene/build-scene-description';
import { rollRandomScene } from '@/lib/scene/random-scene';
import { resolveThumbnailUrl } from '@/lib/scene/thumbnail-url';
import useCharacters from '@/hooks/useCharacters';

type SceneInputProps = {
  /**
   * Reports the current build up to the form on every change.
   * `description` is empty until the required layers (subject +
   * location) are picked. `selection` is the raw picker state — the
   * parent persists it so a paywall-interrupted scene can be restored
   * after checkout (see lib/create/pending-creation).
   */
  onChange: (next: {
    description: string;
    /** The kid's selected characters (up to MAX_SUBJECTS), in pick order. */
    characterIds: string[];
    selection: SceneSelection;
  }) => void;
  /**
   * The wizard owns its own "Create!" button (final step), so scene mode
   * does NOT use the shared FormCTA. This fires when the kid taps Create
   * with the required steps satisfied — the form submits from here.
   */
  onCreate: () => void;
  /**
   * Mirror of the parent form's `showCharacterPicker` gate: characters
   * flag is on AND user is signed in. When false, the `your-character`
   * sentinel is dropped from the subject layer entirely — kid never sees
   * an "Add character" tile that would dead-end at the auth wall.
   */
  charactersEnabled: boolean;
  /**
   * When true, the wizard's Create button stays a normal-looking Create
   * button but tap fires `onCreateBlockedTap` (opens the paywall)
   * instead of `onCreate`. Surfaces the paywall at the START of the
   * wizard, not after the kid has built the scene.
   */
  createBlocked?: boolean;
  /** Fired when the kid taps the blocked Create button. */
  onCreateBlockedTap?: () => void;
  /**
   * Seeds the picker's initial selection — used to restore a scene
   * that was interrupted by the paywall and resumed after checkout.
   * Defaults to an empty selection.
   */
  initialSelection?: SceneSelection;
};

// One label namespace for the whole scene picker. The app owns i18n;
// coloring-ui only renders the strings we pass.
const SceneInput = ({
  onChange,
  onCreate,
  charactersEnabled,
  createBlocked = false,
  onCreateBlockedTap,
  initialSelection,
}: SceneInputProps) => {
  const t = useTranslations('createForm.scene');
  const router = useRouter();
  const { characters } = useCharacters();
  const { setDescription } = useInputMode();
  const [selection, setSelection] = useState<SceneSelection>(
    initialSelection ?? {},
  );

  // The kid's READY characters, each a selectable "friend" in its own row.
  // They share the subject layer's MAX_SUBJECTS cap with the preset animals,
  // so any mix of up to two (two friends, two presets, or one of each) works.
  const readyCharacters = useMemo(
    () => characters.filter((c) => c.status === 'READY'),
    [characters],
  );
  const hasCharacter = readyCharacters.length > 0;
  // Map a friend option key (`char:<id>`) back to the character.
  const characterByOptionKey = useMemo(
    () => new Map(readyCharacters.map((c) => [`char:${c.id}`, c])),
    [readyCharacters],
  );

  const layers = useMemo<SceneLayer[]>(() => {
    // Catalogue stores R2 keys (env-agnostic); resolve to a full public
    // URL at render time so the same catalogue works in dev + prod
    // without committing env-specific URLs.
    const toTile = (o: {
      key: string;
      label: string;
      icon: SceneLayer['options'][number]['icon'];
      duotone: SceneLayer['options'][number]['duotone'];
      thumbnailKey: string | null;
    }) => ({
      key: o.key,
      label: o.label,
      icon: o.icon,
      duotone: o.duotone,
      thumbnailUrl: resolveThumbnailUrl(o.thumbnailKey),
    });

    // Friend group (the kid's saved characters) — one selectable disc per
    // READY character showing its COLOUR portrait, plus an add-friend tile.
    // Replaces the old single `your-character` sentinel (which rendered a
    // star). Only when the characters feature is enabled.
    const friendDuotone = {
      primary: 'hsl(var(--crayon-purple))',
      secondary: 'hsl(var(--crayon-pink))',
    };
    const friendOptions: SceneLayer['options'] = charactersEnabled
      ? [
          ...readyCharacters.map((c) => ({
            key: `char:${c.id}`,
            label: c.name,
            icon: faUser,
            duotone: friendDuotone,
            // COLOUR portrait — line art is only the generation reference.
            thumbnailUrl: c.portraitUrl ?? c.portraitLineArtUrl,
            group: 'friends' as const,
          })),
          // Always-present add-friend tile (deep-links to /characters).
          {
            key: 'add-friend',
            label: t('subjectAddCharacter'),
            icon: faUserPlus,
            duotone: friendDuotone,
            thumbnailUrl: null,
            group: 'friends' as const,
            state: 'add' as const,
          },
        ]
      : [];

    // Preset subjects (animals etc.) — drop the legacy `your-character`
    // sentinel; saved characters are now their own friend options above.
    const presetOptions = SUBJECT_OPTIONS.filter(
      (o) => o.key !== 'your-character',
    ).map((o) => toTile({ ...o, label: t(`subject.${o.key}`) }));

    return [
      {
        id: 'subject',
        title: t('subjectTitle'),
        kind: 'multi',
        maxSelections: MAX_SUBJECTS,
        options: [...friendOptions, ...presetOptions],
      },
      {
        id: 'location',
        title: t('locationTitle'),
        kind: 'single',
        options: LOCATION_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`location.${o.key}`) }),
        ),
      },
      {
        id: 'weather',
        title: t('weatherTitle'),
        kind: 'single',
        options: WEATHER_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`weather.${o.key}`) }),
        ),
      },
      {
        id: 'activity',
        title: t('activityTitle'),
        kind: 'single',
        options: ACTIVITY_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`activity.${o.key}`) }),
        ),
      },
      {
        id: 'accent',
        title: t('accentTitle'),
        kind: 'single',
        options: ACCENT_OPTIONS.map((o) =>
          toTile({ ...o, label: t(`accent.${o.key}`) }),
        ),
      },
    ];
  }, [t, readyCharacters, charactersEnabled]);

  // The add-friend tile routes to /characters instead of selecting, so it's
  // marked "locked" (SceneBuilder fires onLockedTap for locked tiles). The
  // saved-character discs stay normal selectable tiles. (The tile still
  // renders as an `add` affordance via its `state: 'add'`, not a lock icon.)
  const lockedKeys = useMemo(
    () => (charactersEnabled ? { subject: ['add-friend'] } : undefined),
    [charactersEnabled],
  );

  // Derive description + characterIds from picks. The description is
  // mirrored into InputModeContext via setDescription — that's what flips
  // `isReady`, which is what FormCTA keys its enabled state off. The
  // characterIds are reported up via onChange because they're scene-specific
  // and the shared context has no slot for them.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const rawSubjects = selection.subject ?? [];
    // Split the picks into preset subject keys (catalogue) vs friend keys
    // (`char:<id>`). Friends contribute their NAME to the description and
    // their ID to the character pipeline; presets are plain catalogue keys.
    const presetSubjects = rawSubjects.filter(
      (s) => !s.startsWith('char:') && s !== 'add-friend',
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

    // Required layers gate a usable description: at least one subject (preset
    // OR a picked friend) AND a location.
    const realSubjectCount = presetSubjects.length + pickedCharacters.length;
    const ready = realSubjectCount > 0 && Boolean(picks.location);
    const description = ready ? buildSceneDescription(picks) : '';

    setDescription(description);
    onChangeRef.current({
      description,
      characterIds: pickedCharacters.map((c) => c.id),
      // Raw picker state — the parent persists this so a paywall-
      // interrupted scene can be restored after checkout.
      selection,
    });
  }, [selection, characterByOptionKey, setDescription]);

  const handleSurpriseMe = () => {
    const rolled = rollRandomScene();
    setSelection({
      subject: rolled.subjects,
      location: [rolled.location],
      weather: rolled.weather ? [rolled.weather] : [],
      activity: rolled.activity ? [rolled.activity] : [],
      accent: rolled.accent ? [rolled.accent] : [],
    });
    // A dice roll isn't a submission — the real CREATION_SUBMITTED fires
    // from the form on Create with the built description. We don't add a
    // bespoke scene-interaction event here (no payload type for it); if
    // dice-vs-manual attribution is wanted later, thread a flag through
    // the submit payload instead.
  };

  const handleLockedTap = (_layerId: string, optionKey: string) => {
    if (optionKey === 'add-friend') {
      // Route to character creation rather than selecting the add tile.
      router.push('/characters?from=create');
    }
  };

  return (
    <div id="scene-input-panel">
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
          ariaLabel: t('ariaLabel'),
          surpriseMe: t('surpriseMe'),
          lockedSuffix: t('lockedMakeCharacter'),
          back: t('back'),
          next: t('next'),
          create: t('create'),
          extrasTitle: t('extrasTitle'),
          skip: t('skip'),
          friendsTitle: t('friendsTitle'),
          subjectGroupTitle: t('subjectGroupTitle'),
        }}
      />
    </div>
  );
};

export default SceneInput;
