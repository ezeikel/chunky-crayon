'use server';

import {
  getMagicColorSuggestionsLogic,
  type MagicColorInput,
} from '@one-colored-pixel/coloring-core';
import { MAGIC_COLOR_SYSTEM, createMagicColorPrompt } from '@/lib/ai';
import { ACTIONS } from '@/constants';
import { getUserId } from '@/app/actions/user';

export type {
  MagicColorResult,
  MagicColorInput,
  MagicColorMode,
} from '@one-colored-pixel/coloring-core';

const config = {
  system: MAGIC_COLOR_SYSTEM,
  createPrompt: createMagicColorPrompt,
};

export async function getMagicColorSuggestions(input: MagicColorInput) {
  const userId = await getUserId(ACTIONS.MAGIC_COLOR);
  return getMagicColorSuggestionsLogic(input, config, userId);
}
