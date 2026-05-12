'use server';

/**
 * Parent-gate token service.
 *
 * Issues a short-lived HMAC-signed nonce after the kid's parent passes a
 * simple subtraction check on the client. Used by:
 *   - createCharacter (Phase 2)
 *   - generateCustomVoiceLine (Phase 4)
 *   - deleteCharacter (any phase)
 *
 * Why HMAC and not just a DB row: the gate is asked many times, fast, and
 * across surfaces that don't all share a session storage layer. Stateless
 * tokens keep the round-trip cheap and the failure modes obvious.
 *
 * Token format: `${payload}.${sig}` where payload is base64url JSON
 *   { uid, exp, scope }
 * and sig is HMAC-SHA256(payload, NEXT_AUTH_SECRET) — base64url encoded.
 *
 * Scoping: a token is bound to one action scope (e.g. 'character:create')
 * so a passed gate for character creation can't be replayed against voice
 * generation. Add new scopes as new gated actions appear.
 *
 * Three-wrong-answer lockout is enforced client-side via localStorage — no
 * need to track it on the server because the gate's only purpose is friction,
 * not a real auth boundary. The HMAC is what matters server-side.
 */

import crypto from 'node:crypto';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

const TTL_SECONDS = 5 * 60; // 5 minutes

export type ParentGateScope =
  | 'character:create'
  | 'character:delete'
  | 'character:voice-custom';

type Payload = {
  uid: string;
  exp: number; // unix seconds
  scope: ParentGateScope;
};

const b64url = (buf: Buffer): string =>
  buf
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const b64urlDecode = (s: string): Buffer =>
  Buffer.from(
    s.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (s.length % 4)) % 4),
    'base64',
  );

const getSecret = (): string => {
  const secret = process.env.NEXT_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      '[parent-gate] NEXT_AUTH_SECRET not set — required for HMAC signing',
    );
  }
  return secret;
};

const sign = (payload: string): string =>
  b64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());

/**
 * Mint a parent-gate token for the current user + scope.
 *
 * The client calls this after the parent passes the subtraction check;
 * the returned token is then forwarded to the next server action (e.g.
 * `createCharacter`) which calls `verifyParentGateToken` before doing
 * any real work.
 */
export const issueParentGateToken = async (
  scope: ParentGateScope,
): Promise<
  { ok: true; token: string } | { ok: false; error: 'unauthorized' }
> => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) {
    return { ok: false, error: 'unauthorized' };
  }

  const payload: Payload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    scope,
  };
  const payloadStr = b64url(Buffer.from(JSON.stringify(payload)));
  const token = `${payloadStr}.${sign(payloadStr)}`;
  return { ok: true, token };
};

/**
 * Verify a parent-gate token bound to a specific scope + the calling user.
 *
 * Returns `true` only if:
 *   1. Signature matches (constant-time compare to defeat timing attacks).
 *   2. Token hasn't expired.
 *   3. Token's `uid` matches the current request's user.
 *   4. Token's `scope` matches the requested scope.
 *
 * Called inline by gated server actions — they fail with a friendly
 * 'parent_gate_required' error if this returns false.
 */
export const verifyParentGateToken = async (
  token: string,
  scope: ParentGateScope,
): Promise<boolean> => {
  if (typeof token !== 'string' || !token.includes('.')) {
    return false;
  }
  const [payloadStr, sig] = token.split('.');
  if (!payloadStr || !sig) return false;

  const expectedSig = sign(payloadStr);
  // Constant-time comparison defeats sig-guessing via timing.
  const sigOk =
    sig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!sigOk) return false;

  let payload: Payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString('utf8')) as Payload;
  } catch {
    return false;
  }

  if (payload.scope !== scope) return false;
  if (
    typeof payload.exp !== 'number' ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId || userId !== payload.uid) return false;

  return true;
};
