/**
 * Gateable input modes — the plain constant + type + guard.
 *
 * Kept OUT of `app/actions/scene.ts` because that file is `'use server'`
 * and Next.js only allows async function exports from a server-action
 * module. Client components (InputModeSelector, ModeAccessSettings) need
 * the constant + type, so they live here in a plain module both the
 * action and the client can import.
 *
 * Scene Builder ('scene') is intentionally NOT gateable — it is always on
 * and can never be locked.
 */

export const GATEABLE_MODES = ['text', 'voice', 'image'] as const;

export type GateableMode = (typeof GATEABLE_MODES)[number];

export const isGateableMode = (v: unknown): v is GateableMode =>
  typeof v === 'string' && (GATEABLE_MODES as readonly string[]).includes(v);
