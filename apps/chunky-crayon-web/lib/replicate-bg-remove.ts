/**
 * Replicate background-remover helper.
 *
 * Wraps the 851-labs/background-remover model on Replicate so any
 * generation pipeline that produces opaque-white PNGs can pipe its
 * output through this and get back a clean RGBA buffer. The 12-tile
 * profile-avatars + Character Builder species tiles both use this;
 * the original consumer was remove-bundle-hero-backgrounds.ts (which
 * predates this helper and inlines its own copy — fine to leave).
 *
 * Cost: ~$0.0004 per call (T4 GPU on Replicate). 12 avatars ≈ $0.005,
 * 40+ Character Builder tiles ≈ $0.02.
 *
 * Why this exists: gpt-image-2 silently rejects
 * `background:'transparent'` ("Transparent background is not supported
 * for this model"). gpt-image-1 supports native alpha but produces a
 * different aesthetic for the chunky-kid recipe — so we keep
 * gpt-image-2 for generation and add this post-step for transparency.
 * See feedback_always_transparent_pngs.md.
 */

const MODEL_VERSION =
  'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';

type ReplicatePrediction = {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
};

const getToken = (): string => {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error('REPLICATE_API_TOKEN not set');
  return t;
};

const startPrediction = async (imageUrl: string): Promise<string> => {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: { image: imageUrl },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Replicate start failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as ReplicatePrediction;
  return json.id;
};

const pollPrediction = async (id: string): Promise<string> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${getToken()}` },
    });
    // eslint-disable-next-line no-await-in-loop
    const json = (await res.json()) as ReplicatePrediction;
    if (json.status === 'succeeded') {
      if (!json.output) throw new Error('Succeeded but no output URL');
      return json.output;
    }
    if (json.status === 'failed' || json.status === 'canceled') {
      throw new Error(
        `Prediction ${json.status}: ${json.error ?? '(no error)'}`,
      );
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => {
      setTimeout(r, 1000);
    });
  }
  throw new Error('Prediction timed out after 60s');
};

/**
 * Send a public URL to Replicate's background remover, poll for the
 * RGBA result, fetch it, and return the buffer. Caller is responsible
 * for uploading the result wherever they want.
 *
 * Throws on Replicate failure / timeout. No retries (caller can wrap).
 */
export const removeBackground = async (
  publicImageUrl: string,
): Promise<Buffer> => {
  const predictionId = await startPrediction(publicImageUrl);
  const outputUrl = await pollPrediction(predictionId);
  const fetched = await fetch(outputUrl);
  if (!fetched.ok) {
    throw new Error(`Output fetch failed: ${fetched.status}`);
  }
  return Buffer.from(await fetched.arrayBuffer());
};
