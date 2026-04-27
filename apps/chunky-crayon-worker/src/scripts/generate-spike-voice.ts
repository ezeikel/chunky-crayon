/**
 * One-off — generate kid + adult voice clips for the koala spike fixture.
 *
 * Outputs:
 *   public/spike/koala-kid-voice.mp3
 *   public/spike/koala-adult-voice.mp3
 *
 * Run from worker dir:
 *   set -a && source /tmp/voice-env.tmp && set +a
 *   ANTHROPIC_API_KEY=<...> pnpm tsx src/scripts/generate-spike-voice.ts
 *
 * Delete the file once V2 reels ship — no longer needed at that point;
 * real renders generate per-image voice clips on the fly.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReelScript } from "../script/generate.js";
import { generateVoiceClip } from "../voice/elevenlabs.js";

const PROMPT = "a koala building a sandcastle at the beach";
const TITLE = "Cute Koala Building a Sandcastle Coloring Page";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = resolve(__dirname, "..", "..", "public", "spike");

async function main() {
  const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
  const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!kidVoiceId || !adultVoiceId) {
    throw new Error(
      "ELEVENLABS_KID_VOICE_ID + ELEVENLABS_ADULT_VOICE_ID required",
    );
  }

  console.log("[generate-spike-voice] generating script via Claude…");
  const script = await generateReelScript({
    prompt: PROMPT,
    imageTitle: TITLE,
  });
  console.log("[generate-spike-voice] script:", script);

  console.log("[generate-spike-voice] generating kid clip…");
  const kidPath = `${OUT_DIR}/koala-kid-voice.mp3`;
  await generateVoiceClip({
    text: script.kidLine,
    voiceId: kidVoiceId,
    outputPath: kidPath,
  });
  console.log(`[generate-spike-voice] wrote ${kidPath}`);

  console.log("[generate-spike-voice] generating adult clip…");
  const adultPath = `${OUT_DIR}/koala-adult-voice.mp3`;
  await generateVoiceClip({
    text: script.adultLine,
    voiceId: adultVoiceId,
    outputPath: adultPath,
  });
  console.log(`[generate-spike-voice] wrote ${adultPath}`);
}

main().catch((err) => {
  console.error("[generate-spike-voice] fatal:", err);
  process.exit(1);
});
