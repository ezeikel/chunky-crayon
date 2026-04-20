'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';

type Theme = 'rainbow' | 'unicorn' | 'dinosaur' | 'space';

const THEMES: Array<{ key: Theme; label: string; emoji: string }> = [
  { key: 'rainbow', label: 'Rainbow', emoji: '🌈' },
  { key: 'unicorn', label: 'Unicorn', emoji: '🦄' },
  { key: 'dinosaur', label: 'Dinosaur', emoji: '🦖' },
  { key: 'space', label: 'Space', emoji: '🚀' },
];

const BirthdayInviteForm = () => {
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [rsvp, setRsvp] = useState('');
  const [theme, setTheme] = useState<Theme>('rainbow');
  const [fourUp, setFourUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.TOOL_VIEWED, { tool: 'birthday-invite' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) {
      toast.error("Please enter your child's name.");
      return;
    }

    const parsedAge = age.trim() ? parseInt(age, 10) : NaN;
    const ageValue = Number.isInteger(parsedAge) ? parsedAge : null;

    trackEvent(TRACKING_EVENTS.TOOL_SUBMITTED, {
      tool: 'birthday-invite',
      theme,
      fourUp,
      hasAge: ageValue !== null,
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/tools/birthday-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          age: ageValue,
          date,
          time,
          location,
          rsvp,
          theme,
          fourUp,
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
      a.download = `${safe || 'birthday'}-invite.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Your invite is ready!');
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
      {/* Child's name + age */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col gap-2">
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
            placeholder="Erinma"
            maxLength={30}
            required
            className="rounded-coloring-card border-2 border-paper-cream-dark p-3 text-lg font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="age"
            className="font-tondo font-bold text-text-primary"
          >
            Age (optional)
          </label>
          <input
            id="age"
            type="number"
            min={1}
            max={18}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="5"
            className="rounded-coloring-card border-2 border-paper-cream-dark p-3 text-lg font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
          />
        </div>
      </div>

      {/* When */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="date"
            className="font-tondo font-bold text-text-primary"
          >
            Date
          </label>
          <input
            id="date"
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="Saturday 3rd May"
            maxLength={60}
            className="rounded-coloring-card border-2 border-paper-cream-dark p-3 font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="time"
            className="font-tondo font-bold text-text-primary"
          >
            Time
          </label>
          <input
            id="time"
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="2pm – 4pm"
            maxLength={40}
            className="rounded-coloring-card border-2 border-paper-cream-dark p-3 font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
          />
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="location"
          className="font-tondo font-bold text-text-primary"
        >
          Location
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="The Jumping Park, Acton"
          maxLength={80}
          className="rounded-coloring-card border-2 border-paper-cream-dark p-3 font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
        />
      </div>

      {/* RSVP */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="rsvp"
          className="font-tondo font-bold text-text-primary"
        >
          RSVP (optional)
        </label>
        <input
          id="rsvp"
          type="text"
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value)}
          placeholder="text Mum on 07123 456789"
          maxLength={80}
          className="rounded-coloring-card border-2 border-paper-cream-dark p-3 font-rooney focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange"
        />
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Theme</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Layout */}
      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Layout</span>
        <div className="flex gap-3">
          {[
            { value: false, label: '1 big invite per page' },
            { value: true, label: '4 invites per page (to cut out)' },
          ].map((opt) => {
            const active = opt.value === fourUp;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setFourUp(opt.value)}
                aria-pressed={active}
                className={cn(
                  'flex-1 py-3 px-2 rounded-coloring-card border-2 transition font-tondo font-bold text-sm',
                  active
                    ? 'bg-btn-orange border-transparent text-white shadow-btn-primary'
                    : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                )}
              >
                {opt.label}
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
        {submitting ? 'Making your invite…' : 'Download PDF'}
      </Button>
    </form>
  );
};

export default BirthdayInviteForm;
