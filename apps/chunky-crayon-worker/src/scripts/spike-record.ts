/**
 * Standalone test: run the recordColoringSession helper end-to-end and print
 * the resulting webm path. Usage from the worker dir:
 *
 *   IMAGE_ID=<id> CC_ORIGIN=http://localhost:3000 pnpm spike:record
 */

import { resolve } from 'node:path';
import { recordColoringSession } from '../record/session.js';

const imageId = process.env.IMAGE_ID ?? 'cmnby66fr00003j6lvnz4seb3';
const origin = process.env.CC_ORIGIN ?? 'http://localhost:3000';
const sweep = (process.env.SWEEP as 'diagonal' | 'horizontal') ?? 'diagonal';

const result = await recordColoringSession({
  imageId,
  origin,
  sweep,
  outDir: resolve(process.cwd(), 'recordings'),
});

console.log(JSON.stringify(result, null, 2));
