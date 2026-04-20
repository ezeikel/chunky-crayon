'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import {
  generateNamePage,
  type NameTheme,
} from '@/app/actions/tools/generate-name-page';

const THEMES: Array<{ key: NameTheme; label: string; emoji: string }> = [
  { key: 'animals', label: 'Animals', emoji: '🦁' },
  { key: 'flowers', label: 'Flowers', emoji: '🌸' },
  { key: 'unicorns', label: 'Unicorns', emoji: '🦄' },
  { key: 'space', label: 'Space', emoji: '🚀' },
  { key: 'dinosaurs', label: 'Dinosaurs', emoji: '🦖' },
  { key: 'vehicles', label: 'Vehicles', emoji: '🚗' },
];

const NameGeneratorForm = () => {
  const router = useRouter();
  const locale = useLocale();
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<NameTheme>('animals');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.TOOL_VIEWED, { tool: 'name' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a name.');
      return;
    }

    trackEvent(TRACKING_EVENTS.TOOL_SUBMITTED, {
      tool: 'name',
      theme,
      nameLength: trimmed.length,
    });

    setSubmitting(true);
    try {
      const result = await generateNamePage({ name: trimmed, theme, locale });
      if ('error' in result) {
        toast.error(result.error);
        trackEvent(TRACKING_EVENTS.TOOL_FAILED, {
          tool: 'name',
          error: result.error,
        });
        return;
      }
      trackEvent(TRACKING_EVENTS.TOOL_COMPLETED, {
        tool: 'name',
        durationMs: 0,
        coloringImageId: result.id,
      });
      router.push(`/coloring-image/${result.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="childName"
          className="font-tondo font-bold text-text-primary"
        >
          Child&apos;s name
        </label>
        <input
          id="childName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Emma"
          maxLength={24}
          required
          pattern="[\p{L}\p{M}0-9 '\-]+"
          className="rounded-coloring-card border-2 border-paper-cream-dark p-3 text-lg font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
        />
        <span className="text-xs text-muted-foreground">
          Up to 24 characters. Letters, numbers, spaces, hyphens and
          apostrophes.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Theme</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const active = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-coloring-card border-2 transition font-tondo font-bold',
                  active
                    ? 'bg-btn-orange border-transparent text-white shadow-btn-primary'
                    : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                )}
              >
                <span className="text-xl">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-lg py-4 bg-btn-orange hover:bg-crayon-orange text-white font-tondo font-bold shadow-btn-primary rounded-coloring-card"
      >
        {submitting ? 'Creating your page…' : 'Make my coloring page'}
      </Button>
    </form>
  );
};

export default NameGeneratorForm;
