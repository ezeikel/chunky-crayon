'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CharacterStatus } from '@one-colored-pixel/db';
import { regenerateCharacterPortrait } from '@/app/actions/characters';

type Props = {
  id: string;
  name: string;
  species: string;
  shortPrompt: string;
  traits: string[];
  signatureDetails: string[];
  referenceSheetPrompt: string;
  portraitUrl: string | null;
  portraitLineArtUrl: string | null;
  status: CharacterStatus;
  failureReason: string | null;
  voicePersona: string | null;
};

const StatusPill = ({ status }: { status: CharacterStatus }) => {
  const tone =
    status === 'READY'
      ? 'bg-green-100 text-green-800'
      : status === 'GENERATING'
        ? 'bg-amber-100 text-amber-800 animate-pulse'
        : 'bg-red-100 text-red-800';
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] uppercase ${tone}`}>
      {status}
    </span>
  );
};

const CharacterDevViewer = (props: Props) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onRegenerate = () => {
    setMsg(null);
    startTransition(async () => {
      const result = await regenerateCharacterPortrait(props.id);
      if (result.ok) {
        setMsg('Regeneration queued. Status flipped to GENERATING.');
        // Poll once after a delay — the worker takes ~30s. The page will be
        // re-fetched on full reload; for now we just nudge the user to refresh.
        setTimeout(() => router.refresh(), 1500);
      } else {
        setMsg(`Failed: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <StatusPill status={props.status} />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={pending || props.status === 'GENERATING'}
          className="rounded-xl bg-black text-white px-4 py-2 text-xs disabled:opacity-50"
        >
          {pending ? 'Regenerating…' : 'Regenerate portrait'}
        </button>
        {msg ? <span className="text-xs text-neutral-600">{msg}</span> : null}
      </div>

      {props.failureReason ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <strong>failureReason:</strong> {props.failureReason}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <figure className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
          <figcaption className="text-xs text-neutral-500 mb-2">
            portraitUrl (colored — reference image)
          </figcaption>
          {props.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.portraitUrl}
              alt={`${props.name} portrait`}
              className="w-full aspect-square object-contain"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-neutral-400 text-xs">
              not generated
            </div>
          )}
        </figure>
        <figure className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
          <figcaption className="text-xs text-neutral-500 mb-2">
            portraitLineArtUrl (potrace SVG)
          </figcaption>
          {props.portraitLineArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.portraitLineArtUrl}
              alt={`${props.name} line art`}
              className="w-full aspect-square object-contain"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-neutral-400 text-xs">
              not generated
            </div>
          )}
        </figure>
      </div>

      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
        <h2 className="text-xs uppercase text-neutral-500 mb-2">
          Parent's input
        </h2>
        <p className="text-sm whitespace-pre-wrap">{props.shortPrompt}</p>
      </section>

      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
        <h2 className="text-xs uppercase text-neutral-500 mb-2">
          Extracted traits
        </h2>
        <ul className="flex flex-wrap gap-2">
          {props.traits.map((t) => (
            <li
              key={t}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
        <h2 className="text-xs uppercase text-neutral-500 mb-2">
          Signature details (QA-checkable)
        </h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          {props.signatureDetails.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
        <h2 className="text-xs uppercase text-neutral-500 mb-2">
          referenceSheetPrompt (sent to gpt-image-2)
        </h2>
        <pre className="whitespace-pre-wrap text-xs leading-relaxed">
          {props.referenceSheetPrompt}
        </pre>
      </section>

      {props.voicePersona ? (
        <section className="rounded-2xl border-2 border-neutral-200 bg-white p-4 text-xs">
          <strong>voicePersona:</strong> {props.voicePersona}
        </section>
      ) : null}
    </div>
  );
};

export default CharacterDevViewer;
