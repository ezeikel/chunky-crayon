'use server';

import {
  getMagicColorSuggestionsLogic,
  type MagicColorInput,
} from '@one-colored-pixel/coloring-core';
import {
  MAGIC_COLOR_SYSTEM,
  createMagicColorPrompt,
  getTracedModels,
} from '@/lib/ai';
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
  const { analytics } = getTracedModels({
    userId: userId ?? undefined,
    properties: {
      action: 'magic-color',
      mode: input.mode ?? 'accurate',
      touchX: input.touchX.toFixed(2),
      touchY: input.touchY.toFixed(2),
    },
  });
  return getMagicColorSuggestionsLogic(input, config, analytics);
}
