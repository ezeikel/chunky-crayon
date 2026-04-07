/**
 * Random Description Generation — Coloring Habitat
 */

import { createRandomDescriptionGenerator } from "@one-colored-pixel/coloring-core";
import {
  SETTINGS,
  CHARACTERS,
  ACTIVITIES,
  LOCATIONS,
  THEME_MAP,
} from "@/constants";

const generator = createRandomDescriptionGenerator({
  settings: SETTINGS,
  characters: CHARACTERS,
  activities: ACTIVITIES,
  locations: LOCATIONS,
  themeMap: THEME_MAP,
});

export const getRandomSetting = generator.getRandomSetting;
export const getRandomCharacter = generator.getRandomCharacter;
export const getRandomActivity = generator.getRandomActivity;
export const getRandomLocation = generator.getRandomLocation;
export const getRandomDescription = generator.getRandomDescription;
export const getDescriptionForSetting = generator.getDescriptionForSetting;
export const getRandomDescriptionSmart = generator.getRandomDescriptionSmart;
