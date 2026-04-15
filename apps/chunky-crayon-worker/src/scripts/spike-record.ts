/**
 * Standalone test: run the recordColoringSession helper end-to-end and print
 * the resulting webm path. Usage from the worker dir:
 *
 *   PROMPT="a friendly dragon" CC_ORIGIN=http://localhost:3000 pnpm spike:record
 */

import { resolve } from "node:path";
import { recordColoringSession } from "../record/session.js";

const prompt = process.env.PROMPT ?? "a cute panda with a flower crown";
const origin = process.env.CC_ORIGIN ?? "http://localhost:3000";
const sweep = (process.env.SWEEP as "diagonal" | "horizontal") ?? "diagonal";

const result = await recordColoringSession({
  prompt,
  origin,
  sweep,
  outDir: resolve(process.cwd(), "recordings"),
});

console.log(JSON.stringify(result, null, 2));
