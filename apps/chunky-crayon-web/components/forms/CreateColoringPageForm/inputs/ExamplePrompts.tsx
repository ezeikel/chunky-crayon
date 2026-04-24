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

// Scrapbook-style stagger — each pill sits at a slight indent and
// rotation so the column reads as hand-arranged sticky notes instead
// of a flat left-aligned list. Cycles on index so a 4th / 5th campaign
// added later still gets variety without a config change.
const STAGGER_CLASSES = [
  'ml-0 -rotate-1',
  'ml-6 rotate-1',
  'ml-3 -rotate-[0.5deg]',
] as const;

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
      <div className="flex flex-col items-start gap-1.5">
        {EXAMPLES.map(({ key, labelKey }, i) => {
          const text = t(labelKey);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key, text)}
              className={cn(
                'font-tondo text-sm px-3 py-1.5 rounded-full bg-crayon-orange-light/20 border border-crayon-orange/40 text-crayon-orange-dark hover:bg-crayon-orange-light/40 hover:border-crayon-orange hover:rotate-0 transition-all duration-200',
                STAGGER_CLASSES[i % STAGGER_CLASSES.length],
              )}
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
