'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faHorseHead,
  faRocket,
  faFish,
  faDinosaur,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { trackEvent } from '@/utils/analytics-client';
import { trackResourceSaved, trackViewContent } from '@/utils/pixels';
import { recordResourceSaved } from '@/app/actions/conversions';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';

type Theme = 'stars' | 'unicorn' | 'space' | 'ocean' | 'dinosaur';

const THEMES: Array<{
  key: Theme;
  label: string;
  icon: IconDefinition;
  swatch: string;
}> = [
  { key: 'stars', label: 'Superstar', icon: faStar, swatch: '#F86A2F' },
  { key: 'unicorn', label: 'Unicorn', icon: faHorseHead, swatch: '#D05CAC' },
  { key: 'space', label: 'Space', icon: faRocket, swatch: '#3A3D98' },
  { key: 'ocean', label: 'Ocean', icon: faFish, swatch: '#0F7D9E' },
  { key: 'dinosaur', label: 'Dinosaur', icon: faDinosaur, swatch: '#3E8948' },
];

const DEFAULT_BEHAVIORS = [
  'Brush teeth',
  'Get dressed on time',
  'Tidy up toys',
  'Kind words',
  'Bedtime without fuss',
];

const MAX_BEHAVIORS = 7;

const RewardChartForm = () => {
  const [childName, setChildName] = useState('');
  const [theme, setTheme] = useState<Theme>('stars');
  const [days, setDays] = useState<5 | 7>(7);
  const [behaviors, setBehaviors] = useState<string[]>(DEFAULT_BEHAVIORS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.TOOL_VIEWED, { tool: 'reward-chart' });
    trackViewContent({ contentType: 'tool', contentName: 'reward-chart' });
  }, []);

  const updateBehavior = (idx: number, value: string) => {
    setBehaviors((prev) => prev.map((b, i) => (i === idx ? value : b)));
  };

  const addBehavior = () => {
    if (behaviors.length >= MAX_BEHAVIORS) return;
    setBehaviors((prev) => [...prev, '']);
  };

  const removeBehavior = (idx: number) => {
    setBehaviors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBehaviors = behaviors.map((b) => b.trim()).filter(Boolean);

    if (!childName.trim()) {
      toast.error('Please enter your child’s name.');
      return;
    }
    if (trimmedBehaviors.length === 0) {
      toast.error('Add at least one behavior.');
      return;
    }

    trackEvent(TRACKING_EVENTS.TOOL_SUBMITTED, {
      tool: 'reward-chart',
      theme,
      days,
      behaviorCount: trimmedBehaviors.length,
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/tools/reward-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          theme,
          behaviors: trimmedBehaviors,
          days,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = childName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
      a.download = `${safe || 'reward'}-chart.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const resourceEventId = `tool_reward-chart_${Date.now()}`;
      trackResourceSaved({
        method: 'download',
        surface: 'tool',
        contentType: 'pdf',
        contentName: 'reward-chart',
        eventId: resourceEventId,
      });
      void recordResourceSaved({
        method: 'download',
        surface: 'tool',
        contentName: 'reward-chart',
        eventId: resourceEventId,
      });

      toast.success('Your reward chart is ready!');
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
      {/* Child's name */}
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
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="Emma"
          maxLength={40}
          required
          className="rounded-coloring-card border-2 border-paper-cream-dark p-3 text-lg font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
        />
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Theme</span>
        <div className="flex flex-wrap gap-3">
          {THEMES.map((t) => {
            const active = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-coloring-card border-2 transition',
                  active
                    ? 'border-transparent text-white shadow-btn-primary'
                    : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                )}
                style={
                  active ? { backgroundColor: t.swatch } : { color: t.swatch }
                }
              >
                <FontAwesomeIcon icon={t.icon} className="text-xl" />
                <span className="font-tondo font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Days */}
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Days</span>
        <div className="flex gap-3">
          {([5, 7] as const).map((d) => {
            const active = d === days;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={active}
                className={cn(
                  'flex-1 py-3 rounded-coloring-card border-2 transition font-tondo font-bold',
                  active
                    ? 'bg-btn-orange border-transparent text-white shadow-btn-primary'
                    : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                )}
              >
                {d === 5 ? 'Weekdays (Mon–Fri)' : 'Full week (Mon–Sun)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Behaviors */}
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">
          Behaviors ({behaviors.length} / {MAX_BEHAVIORS})
        </span>
        <div className="flex flex-col gap-2">
          {behaviors.map((b, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={b}
                onChange={(e) => updateBehavior(idx, e.target.value)}
                placeholder={`Behavior ${idx + 1}`}
                maxLength={80}
                className="flex-1 rounded-coloring-card border-2 border-paper-cream-dark p-3 font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
              />
              {behaviors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBehavior(idx)}
                  aria-label={`Remove behavior ${idx + 1}`}
                  className="px-3 rounded-coloring-card border-2 border-paper-cream-dark hover:border-red-400 hover:text-red-500 font-tondo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {behaviors.length < MAX_BEHAVIORS && (
          <button
            type="button"
            onClick={addBehavior}
            className="self-start mt-1 text-sm font-tondo font-bold text-crayon-orange hover:underline"
          >
            + Add another behavior
          </button>
        )}
      </div>

      <Button type="submit" disabled={submitting} size="lg" className="w-full">
        {submitting ? 'Making your chart…' : 'Download PDF'}
      </Button>
    </form>
  );
};

export default RewardChartForm;
