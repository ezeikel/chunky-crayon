import {
  SETTINGS,
  CHARACTERS,
  ACTIVITIES,
  LOCATIONS,
  THEME_MAP,
} from '@/constants';

const getRandomElement = (arr: string[]): string =>
  arr[Math.floor(Math.random() * arr.length)];

export const getRandomSetting = () =>
  getRandomElement(SETTINGS as unknown as string[]);
export const getRandomCharacter = () =>
  getRandomElement(CHARACTERS as unknown as string[]);
export const getRandomActivity = () =>
  getRandomElement(ACTIVITIES as unknown as string[]);
export const getRandomLocation = () =>
  getRandomElement(LOCATIONS as unknown as string[]);

export const getRandomDescription = (): string => {
  const randomSetting = getRandomSetting();
  const randomCharacter = getRandomCharacter();
  const randomActivity = getRandomActivity();
  const randomLocation = getRandomLocation();

  return `A ${randomSetting} scene with ${randomCharacter} ${randomActivity} in ${randomLocation}.`;
};

// smart version (theme aware)

type SmartOpts = {
  characterBias?: number; // 0..1 probability to pick from themed list when available
  activityBias?: number; // 0..1
  locationBias?: number; // 0..1
};

const pickBiased = (
  primary: string[],
  fallback: string[],
  bias: number,
): string => {
  const usePrimary =
    primary.length > 0 && (bias >= 1 || (bias > 0 && Math.random() < bias));
  const pool = usePrimary ? primary : fallback;
  return getRandomElement(pool);
};

export const getDescriptionForSetting = (
  setting: string,
  opts: SmartOpts = {},
): string => {
  const {
    characterBias = 0.75,
    activityBias = 0.75,
    locationBias = 0.85,
  } = opts;

  const theme = THEME_MAP[setting];

  const character = theme
    ? pickBiased(
        theme.characters,
        CHARACTERS as unknown as string[],
        characterBias,
      )
    : getRandomCharacter();

  const activity = theme
    ? pickBiased(
        theme.activities,
        ACTIVITIES as unknown as string[],
        activityBias,
      )
    : getRandomActivity();

  const location = theme
    ? pickBiased(
        theme.locations,
        LOCATIONS as unknown as string[],
        locationBias,
      )
    : getRandomLocation();

  return `A ${setting} scene with ${character} ${activity} in ${location}.`;
};

export const getRandomDescriptionSmart = (opts?: SmartOpts): string => {
  const setting = getRandomSetting();
  return getDescriptionForSetting(setting, opts);
};
