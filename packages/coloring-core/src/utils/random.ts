/**
 * Random description generation for coloring page scene generation.
 * Accepts app-specific seed data as parameters.
 */

type ThemeMap = Record<
  string,
  { characters: string[]; activities: string[]; locations: string[] }
>;

export type RandomSeedConfig = {
  settings: readonly string[];
  characters: readonly string[];
  activities: readonly string[];
  locations: readonly string[];
  themeMap: ThemeMap;
};

const getRandomElement = (arr: readonly string[]): string =>
  arr[Math.floor(Math.random() * arr.length)];

type SmartOpts = {
  characterBias?: number;
  activityBias?: number;
  locationBias?: number;
};

const pickBiased = (
  primary: string[],
  fallback: readonly string[],
  bias: number,
): string => {
  const usePrimary =
    primary.length > 0 && (bias >= 1 || (bias > 0 && Math.random() < bias));
  const pool = usePrimary ? primary : fallback;
  return getRandomElement(pool);
};

/**
 * Create random description generators configured with app-specific seed data.
 */
export function createRandomDescriptionGenerator(config: RandomSeedConfig) {
  const getRandomSetting = () => getRandomElement(config.settings);
  const getRandomCharacter = () => getRandomElement(config.characters);
  const getRandomActivity = () => getRandomElement(config.activities);
  const getRandomLocation = () => getRandomElement(config.locations);

  const getRandomDescription = (): string => {
    return `A ${getRandomSetting()} scene with ${getRandomCharacter()} ${getRandomActivity()} in ${getRandomLocation()}.`;
  };

  const getDescriptionForSetting = (
    setting: string,
    opts: SmartOpts = {},
  ): string => {
    const {
      characterBias = 0.75,
      activityBias = 0.75,
      locationBias = 0.85,
    } = opts;

    const theme = config.themeMap[setting];

    const character = theme
      ? pickBiased(theme.characters, config.characters, characterBias)
      : getRandomCharacter();

    const activity = theme
      ? pickBiased(theme.activities, config.activities, activityBias)
      : getRandomActivity();

    const location = theme
      ? pickBiased(theme.locations, config.locations, locationBias)
      : getRandomLocation();

    return `A ${setting} scene with ${character} ${activity} in ${location}.`;
  };

  const getRandomDescriptionSmart = (opts?: SmartOpts): string => {
    const setting = getRandomSetting();
    return getDescriptionForSetting(setting, opts);
  };

  return {
    getRandomSetting,
    getRandomCharacter,
    getRandomActivity,
    getRandomLocation,
    getRandomDescription,
    getDescriptionForSetting,
    getRandomDescriptionSmart,
  };
}
