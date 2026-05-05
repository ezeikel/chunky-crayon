'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';

type CaseMode = 'upper' | 'lower' | 'both';

const CASE_OPTIONS: Array<{ value: CaseMode; label: string }> = [
  { value: 'upper', label: 'Uppercase (A–Z)' },
  { value: 'lower', label: 'Lowercase (a–z)' },
  { value: 'both', label: 'Both (Aa–Zz)' },
];

const AbcTracingForm = () => {
  const [childName, setChildName] = useState('');
  const [caseMode, setCaseMode] = useState<CaseMode>('upper');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.TOOL_VIEWED, { tool: 'abc-tracing' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackEvent(TRACKING_EVENTS.TOOL_SUBMITTED, {
      tool: 'abc-tracing',
      case: caseMode,
      hasName: childName.trim().length > 0,
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/tools/abc-tracing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          case: caseMode,
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
        .slice(0, 30);
      a.download = `${safe ? safe + '-' : ''}abc-tracing.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Your tracing bundle is ready!');
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

      <div className="flex flex-col gap-2">
        <span className="font-tondo font-bold text-text-primary">Case</span>
        <div className="flex flex-col md:flex-row gap-3">
          {CASE_OPTIONS.map((opt) => {
            const active = opt.value === caseMode;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCaseMode(opt.value)}
                aria-pressed={active}
                className={cn(
                  'flex-1 py-3 px-4 rounded-coloring-card border-2 transition font-tondo font-bold text-sm',
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
        <span className="text-xs text-muted-foreground">
          Uppercase is the usual start for preschool. Teachers often want
          lowercase too for early handwriting.
        </span>
      </div>

      <Button type="submit" disabled={submitting} size="lg" className="w-full">
        {submitting
          ? 'Building your 27-page bundle…'
          : 'Download PDF (27 pages)'}
      </Button>
    </form>
  );
};

export default AbcTracingForm;
