'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPumpkin,
  faTreeChristmas,
  faHeart,
  faRabbit,
  faTurkey,
  faBackpack,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';

type Pack =
  | 'halloween'
  | 'christmas'
  | 'valentine'
  | 'easter'
  | 'thanksgiving'
  | 'back-to-school';

const PACKS: Array<{
  key: Pack;
  label: string;
  icon: IconDefinition;
  color: string;
  count: number;
}> = [
  {
    key: 'halloween',
    label: 'Halloween',
    icon: faPumpkin,
    color: 'text-crayon-orange',
    count: 8,
  },
  {
    key: 'christmas',
    label: 'Christmas',
    icon: faTreeChristmas,
    color: 'text-crayon-green',
    count: 10,
  },
  {
    key: 'valentine',
    label: "Valentine's",
    icon: faHeart,
    color: 'text-crayon-pink',
    count: 6,
  },
  {
    key: 'easter',
    label: 'Easter',
    icon: faRabbit,
    color: 'text-crayon-purple',
    count: 8,
  },
  {
    key: 'thanksgiving',
    label: 'Thanksgiving',
    icon: faTurkey,
    color: 'text-crayon-yellow',
    count: 8,
  },
  {
    key: 'back-to-school',
    label: 'Back to School',
    icon: faBackpack,
    color: 'text-crayon-blue',
    count: 10,
  },
];

const SeasonalPackForm = () => {
  const [childName, setChildName] = useState('');
  const [pack, setPack] = useState<Pack>('halloween');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.TOOL_VIEWED, { tool: 'seasonal-pack' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackEvent(TRACKING_EVENTS.TOOL_SUBMITTED, {
      tool: 'seasonal-pack',
      pack,
      hasName: childName.trim().length > 0,
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/tools/seasonal-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack, childName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pack}-coloring-pack.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Your pack is ready!');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = PACKS.find((p) => p.key === pack)!;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark"
    >
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">
          Pick a pack
        </span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PACKS.map((p) => {
            const active = p.key === pack;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPack(p.key)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center gap-1 py-4 px-3 rounded-coloring-card border-2 transition text-center',
                  active
                    ? 'bg-btn-orange border-transparent text-white shadow-btn-primary'
                    : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                )}
              >
                <FontAwesomeIcon
                  icon={p.icon}
                  className={cn('text-3xl', active ? 'text-white' : p.color)}
                />
                <span className="font-tondo font-bold text-sm">{p.label}</span>
                <span
                  className={cn(
                    'text-xs',
                    active ? 'text-white/85' : 'text-muted-foreground',
                  )}
                >
                  {p.count} pages
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="childName"
          className="font-tondo font-bold text-text-primary"
        >
          Child&apos;s name (optional — prints on the cover)
        </label>
        <input
          id="childName"
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="Erinma"
          maxLength={40}
          className="rounded-coloring-card border-2 border-paper-cream-dark p-3 text-lg font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
        />
      </div>

      <Button type="submit" disabled={submitting} size="lg" className="w-full">
        {submitting
          ? 'Building your pack…'
          : `Download ${selected.label} PDF (${selected.count + 1} pages)`}
      </Button>
    </form>
  );
};

export default SeasonalPackForm;
