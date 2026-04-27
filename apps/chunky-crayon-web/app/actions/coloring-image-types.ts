// Types + type guards extracted from coloring-image.ts because that file
// uses the `'use server'` directive, which restricts exports to async
// functions only. Keep purely synchronous helpers and types here so
// callers can import them without breaking the server-action constraint.

import type { ColoringImage } from '@one-colored-pixel/db';

export type CreateColoringImageResult =
  | Partial<ColoringImage>
  | { error: string; credits: number };

export const isErrorResult = (
  result: CreateColoringImageResult,
): result is { error: string; credits: number } => 'error' in result;

export const isColoringImage = (
  result: CreateColoringImageResult,
): result is Partial<ColoringImage> => !isErrorResult(result);

export const VOICE_CREDIT_COST = 10;
