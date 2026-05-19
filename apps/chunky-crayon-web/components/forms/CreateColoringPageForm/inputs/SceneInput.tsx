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
import useCharacters from '@/hooks/useCharacters';

type SceneInputProps = {
  /**
   * Reports the current build up to the form on every change. `description`
   * is empty until the required layers (subject + location) are picked.
   */
  onChange: (next: { description: string; characterId: string | null }) => void;
  /**
   * The wizard owns its own "Create!" button (final step), so scene mode
   * does NOT use the shared FormCTA. This fires when the kid taps Create
   * with the required steps satisfied — the form submits from here.
   */
  onCreate: () => void;
};

// One label namespace for the whole scene picker. The app owns i18n;
// coloring-ui only renders the strings we pass.
const SceneInput = ({ onChange, onCreate }: SceneInputProps) => {
  const t = useTranslations('createForm.scene');
  const router = useRouter();
  const { characters } = useCharacters();
  const { setDescription } = useInputMode();
  const [selection, setSelection] = useState<SceneSelection>({});

  // First READY character is the one we mix in. v1 is one-character-per
  // scene (same cap the CharacterPicker + server enforce).
  const readyCharacter = useMemo(
    () => characters.find((c) => c.status === 'READY') ?? null,
    [characters],
  );
  const hasCharacter = Boolean(readyCharacter);

  const layers = useMemo<SceneLayer[]>(() => {
    const toTile = (o: {
      key: string;
      label: string;
      icon: SceneLayer['options'][number]['icon'];
      duotone: SceneLayer['options'][number]['duotone'];
      thumbnailUrl: string | null;
    }) => ({
      key: o.key,
      label: o.label,
      icon: o.icon,
      duotone: o.duotone,
      thumbnailUrl: o.thumbnailUrl,
    });

    return [
      {
        id: 'subject',
        title: t('subjectTitle'),
        kind: 'multi',
        maxSelections: MAX_SUBJECTS,
        options: SUBJECT_OPTIONS.map((o) =>
          toTile({
            ...o,
            // Sentinel label flips once a character exists so the tile
            // reads as "your character" rather than a generic prompt.
            label:
              o.key === 'your-character'
                ? readyCharacter
                  ? readyCharacter.name
                  : t('subjectMyCharacter')
                : t(`subject.${o.key}`),
          }),
        ),
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
  }, [t, readyCharacter]);

  // Lock the My Character tile until there's a READY character to mix in.
  const lockedKeys = useMemo(
    () => (hasCharacter ? undefined : { subject: ['your-character'] }),
    [hasCharacter],
  );

  // Derive description + characterId from picks. The description is
  // mirrored into InputModeContext via setDescription — that's what flips
  // `isReady`, which is what FormCTA keys its enabled state off (same
  // pattern VoiceInput uses to surface its transcript). The characterId
  // is reported up via onChange because it's scene-specific and the
  // shared context has no slot for it.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
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

    // Required layers gate a usable description: at least one subject AND
    // a location. A lone `your-character` with no resolved name doesn't
    // count as a subject (buildSceneDescription drops it).
    const realSubjectCount = subjects.filter(
      (s) => s !== 'your-character' || hasCharacter,
    ).length;
    const ready = realSubjectCount > 0 && Boolean(picks.location);
    const description = ready ? buildSceneDescription(picks) : '';

    setDescription(description);
    onChangeRef.current({
      description,
      characterId:
        subjects.includes('your-character') && readyCharacter
          ? readyCharacter.id
          : null,
    });
  }, [selection, readyCharacter, hasCharacter, setDescription]);

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
    if (optionKey === 'your-character') {
      // No character yet — send them to make one rather than dead-ending.
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
          stepLabel: (c, n) => t('stepLabel', { current: c, total: n }),
        }}
      />
    </div>
  );
};

export default SceneInput;
