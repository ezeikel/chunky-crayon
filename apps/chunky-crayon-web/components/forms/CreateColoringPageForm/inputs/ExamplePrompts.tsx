'use client';

import { useTranslations } from 'next-intl';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';

// Keys match the three active Meta ad concepts so we can correlate
// pill clicks with ad spend later (utm_campaign=trex/foxes/dragon maps
// 1:1 to the example key here).
const EXAMPLES = [
  { key: 'trex', labelKey: 'exampleTrex' },
  { key: 'dragon', labelKey: 'exampleDragon' },
  { key: 'foxes', labelKey: 'exampleFoxes' },
] as const;

type ExampleKey = (typeof EXAMPLES)[number]['key'];

type ExamplePromptsProps = {
  className?: string;
  location: 'homepage' | 'start';
};

// Clickable example-prompt pills shown under the text input. Clicking
// one pre-fills the textarea with the full prompt and tracks which
// example drove the creation. Only rendered in the text input mode.
const ExamplePrompts = ({ className, location }: ExamplePromptsProps) => {
  const t = useTranslations('createForm');
  const { setDescription } = useInputMode();

  const handleClick = (key: ExampleKey, text: string) => {
    setDescription(text);
    trackEvent(TRACKING_EVENTS.EXAMPLE_PROMPT_CLICKED, {
      example: key,
      location,
    });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="font-tondo text-xs text-text-muted">{t('examplesLabel')}</p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(({ key, labelKey }) => {
          const text = t(labelKey);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key, text)}
              className="font-tondo text-sm px-3 py-1.5 rounded-full bg-crayon-orange-light/20 border border-crayon-orange/40 text-crayon-orange-dark hover:bg-crayon-orange-light/40 hover:border-crayon-orange transition-colors"
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExamplePrompts;
