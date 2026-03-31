/**
 * @one-colored-pixel/storage
 *
 * Shared R2 storage module for all One Colored Pixel apps.
 * Provides put, del, list, exists with the same API as @vercel/blob.
 */

export { put, del, list, exists } from "./r2";
export type { PutOptions, PutResult, ListOptions, ListResult } from "./r2";
