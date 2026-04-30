/**
 * POST /api/voice/transcribe
 *
 * Prerecorded Deepgram transcription. The voice flow uses streaming for
 * live UX feedback (audio bars + dev transcript overlay), but ships the
 * full audio blob here on stop for the actual transcript that gets used
 * downstream. Prerecorded sees the entire utterance with full context,
 * so accuracy is meaningfully better than streaming for short kid
 * utterances in noisy environments — the primary failure mode we hit
 * with streaming was Q1 audio bleeding back through speakers and being
 * accumulated as text. Prerecorded with a tight confidence floor + the
 * same speaker-0 diarization fixes that.
 *
 * Request: multipart/form-data with `audio` field (webm/opus blob from
 * MediaRecorder). Wire format chosen to match the browser's native
 * output — no client-side transcoding needed.
 *
 * Response: { transcript, confidence, durationMs }.
 *
 * Auth: same as deepgram-token — voice mode requires sign-in, since
 * parental gate + moderation footprint don't make sense without an
 * account.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

export const maxDuration = 30;

// Reasonable cap so we don't proxy multi-minute uploads. Voice answers
// are short by design (Q1+Q2 each capped at ~30s of recording).
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB

type DeepgramResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
      }>;
    }>;
  };
};

export const POST = async (request: NextRequest) => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json(
      { error: 'voice_mode_requires_signin' },
      { status: 401 },
    );
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'deepgram_not_configured' },
      { status: 500 },
    );
  }

  // Parse the multipart form. Deepgram's prerecorded API takes the raw
  // audio bytes as the request body — we pull the blob, validate size,
  // then forward.
  const formData = await request.formData().catch(() => null);
  const audio = formData?.get('audio');
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: 'audio field required' },
      { status: 400 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: 'audio empty' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'audio too large' }, { status: 413 });
  }

  // nova-3 + smart_format. Pinning language=en-GB prevents the model
  // second-guessing the tongue on short utterances. Diarization
  // explicitly OFF: on the 2-4 second clips kids produce, diarize=true
  // can mis-attribute legit words to a non-speaker-0 channel and we
  // filter them out, dropping real speech. On short clips there's only
  // one speaker anyway — close-mic VAD already gives us that.
  const startedAt = Date.now();
  const dgUrl =
    'https://api.deepgram.com/v1/listen?model=nova-3&language=en-GB&smart_format=true&punctuate=true';

  const audioBuffer = await audio.arrayBuffer();
  const upstream = await fetch(dgUrl, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      // Tell Deepgram what we're sending. webm/opus is the MediaRecorder
      // default; we pass through the blob's reported MIME so the model
      // gets the right decoder.
      'Content-Type': audio.type || 'audio/webm',
    },
    body: audioBuffer,
  });

  const durationMs = Date.now() - startedAt;

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    console.error(
      `[/api/voice/transcribe] Deepgram ${upstream.status}: ${text.slice(0, 300)}`,
    );
    return NextResponse.json(
      { error: 'deepgram_failed', status: upstream.status },
      { status: 502 },
    );
  }

  const json = (await upstream.json()) as DeepgramResponse;
  const alt = json.results?.channels?.[0]?.alternatives?.[0];
  const fullTranscript = alt?.transcript ?? '';
  const overallConfidence = alt?.confidence ?? 0;

  // Diarization is off, so the full transcript IS what we want.
  const transcript = fullTranscript.trim();

  return NextResponse.json({
    transcript,
    fullTranscript,
    confidence: overallConfidence,
    durationMs,
  });
};
