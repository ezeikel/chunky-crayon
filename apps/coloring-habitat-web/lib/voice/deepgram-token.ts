/**
 * Deepgram short-lived token mint.
 *
 * The voice-mode client opens a WebSocket directly to Deepgram for STT
 * (lower latency than proxying through our server). Direct connection
 * means we can't ship `DEEPGRAM_API_KEY` to the client — instead the
 * server mints a short-lived "ephemeral" token, scoped to listen-only,
 * with a 30-second TTL. Client uses that token in the WS auth header.
 *
 * Deepgram docs: https://developers.deepgram.com/docs/keys#temporary-keys
 *
 * If Deepgram changes the endpoint or token shape, this is the only file
 * to update.
 */

const DEEPGRAM_BASE = "https://api.deepgram.com/v1";

/** Token TTL in seconds. 30s is enough for the user to start their utterance
 *  but small enough that a leaked token is uninteresting. */
const TOKEN_TTL_SECONDS = 30;

/**
 * Permission scopes for the ephemeral token. We only need to consume audio
 * (i.e. send audio for transcription via the streaming `listen` endpoint),
 * so we lock it down to that single permission.
 *
 * `usage:write` is Deepgram's name for "can call API endpoints"; without it
 * the token is signed but useless. The endpoint scoping is enforced by the
 * project's API key policy on Deepgram's side.
 */
const TOKEN_SCOPES = ["usage:write"] as const;

export type DeepgramEphemeralToken = {
  /** Bearer token to put in the WS Authorization header. */
  key: string;
  /** ISO timestamp the token expires. Client uses for retry/reconnect logic. */
  expiresAt: string;
};

/**
 * Mint a short-lived Deepgram token for the calling client.
 *
 * The Deepgram project API key (long-lived) lives in `DEEPGRAM_API_KEY`
 * and never leaves the server. This function exchanges it for a 30-second
 * scoped key that's safe to send to the browser.
 */
export async function mintDeepgramToken(): Promise<DeepgramEphemeralToken> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY not set");
  }

  // Deepgram requires a parent-key project ID to mint child keys. We fetch
  // it once on first use; in practice each project has one.
  const projectId = await getDeepgramProjectId(apiKey);

  const response = await fetch(`${DEEPGRAM_BASE}/projects/${projectId}/keys`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: `voice-mode-ephemeral-${Date.now()}`,
      scopes: TOKEN_SCOPES,
      time_to_live_in_seconds: TOKEN_TTL_SECONDS,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `[deepgram-token] mint failed ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    key: string;
    expiration_date?: string;
  };

  if (!data.key) {
    throw new Error("[deepgram-token] response missing key field");
  }

  // Deepgram returns ISO-format `expiration_date` on success; we surface
  // it to the client so reconnect logic doesn't need its own clock skew
  // tolerance.
  const expiresAt =
    data.expiration_date ??
    new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  return { key: data.key, expiresAt };
}

// ────────────────────────────────────────────────────────────────────────────
// Internal — project id lookup, cached in memory across requests
// ────────────────────────────────────────────────────────────────────────────

let cachedProjectId: string | null = null;

async function getDeepgramProjectId(apiKey: string): Promise<string> {
  if (cachedProjectId) return cachedProjectId;

  const response = await fetch(`${DEEPGRAM_BASE}/projects`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `[deepgram-token] project lookup failed ${response.status}: ${body.slice(0, 200)}`,
    );
  }
  const data = (await response.json()) as {
    projects?: Array<{ project_id: string }>;
  };
  const id = data.projects?.[0]?.project_id;
  if (!id) {
    throw new Error("[deepgram-token] no projects on this API key");
  }
  cachedProjectId = id;
  return id;
}
