/**
 * Unified Storage Module
 *
 * Export R2 storage functions with the same API as @vercel/blob
 * for drop-in replacement across the codebase.
 */

export { put, del, list, exists } from './r2';
export type { PutOptions, PutResult, ListOptions, ListResult } from './r2';
