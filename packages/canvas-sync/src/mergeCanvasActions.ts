/**
 * Append-merge for web↔mobile coloring-progress conflict resolution.
 *
 * Both clients used to handle a 409 (version conflict) by blindly re-POSTing
 * their OWN full action array at the server's version — last writer clobbers,
 * the other device's strokes since the common ancestor are lost. This module
 * replaces that with a deterministic append-merge: union server∪local by stable
 * id, order by (timestamp, seq, id), and collapse terminal actions (a later
 * Auto Color / Start Over supersedes earlier work). The server stays dumb — the
 * whole policy is client-side and runs identically on both platforms (so both
 * collapse to the SAME array; otherwise saved history diverges across devices).
 *
 * Pure, deterministic, dependency-free: no Date/Math.random/DOM/RN. Safe in the
 * Hermes bundle and the Next bundle alike. The one impurity allowed — id
 * generation — is isolated in makeActionId, which callers invoke at action
 * CREATION, never inside the merge.
 */

import type { CanvasAction } from "./canvas-types";

// Window (ms) within which a cross-device action is NOT truncated by a terminal,
// to tolerate wall-clock skew between two devices. A terminal from device X only
// drops an earlier action from device Y if Y's action predates the terminal by
// MORE than this. Same-device actions are trusted by their own clock and
// collapse exactly. 5s is a product/QA-tunable default.
export const SKEW_WINDOW_MS = 5000;

/**
 * Hermes-safe UUID v4. Web/Node use the real CSPRNG; React Native (Hermes has
 * no global crypto.randomUUID, and no get-random-values/uuid/nanoid polyfill is
 * installed) falls back to the same Math.random generator the app already ships
 * in apps/chunky-crayon-mobile/lib/auth.ts. With ≤MAX_HISTORY (~50) actions per
 * canvas, collision probability is negligible.
 *
 * MUST be called once at action creation and stored on the action — never at
 * serialize time (that re-rolls the id every save and breaks dedup).
 */
export function makeActionId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// A real (post-Stage-4) id is a UUID v4. Anything else (missing, or the legacy
// `action-<ts>-<index>` positional id from before this change) must be
// normalized to a deterministic content id so the same logical action dedups
// across saves and across the two clients.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_POSITIONAL_ID_RE = /^action-\d+-\d+$/;

/**
 * Deterministic, cross-client-stable id for a legacy / id-less action. Hashes a
 * CANONICAL projection of only the semantically-identifying fields per type
 * (sorted, fixed key order) — NOT raw JSON.stringify(data), because web and
 * mobile emit different data key sets/orderings for the same logical action, so
 * a raw-JSON hash would diverge and the action would appear twice in the union.
 */
export function canonicalLegacyId(action: CanvasAction): string {
  const d = action.data ?? {};
  let sig: string;
  switch (action.type) {
    case "stroke":
      sig = [d.path ?? "", d.color ?? "", d.brushType ?? ""].join("|");
      break;
    case "fill":
      sig = [d.x ?? "", d.y ?? "", d.fillColor ?? d.color ?? ""].join("|");
      break;
    case "sticker":
      sig = [d.stickerId ?? "", d.position?.x ?? "", d.position?.y ?? ""].join(
        "|",
      );
      break;
    case "region":
      sig = [d.mode ?? "", d.variant ?? "", d.path ?? ""].join("|");
      break;
    case "clear":
      sig = "clear";
      break;
    default:
      sig = "";
  }
  return `legacy-${action.type}-${action.timestamp}-${djb2(sig)}`;
}

// Tiny stable string hash (djb2). Deterministic across platforms — all we need
// for a content-derived legacy id.
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  // >>> 0 → unsigned; base36 keeps it short.
  return (h >>> 0).toString(36);
}

/**
 * Filter a raw action array to the canonical wire types and normalize legacy
 * shapes. The 409 body returns the server's `actions` verbatim, which can
 * contain a stray `snapshot` entry (never a real action) or a legacy
 * `magic-fill` (a whole-page Auto Color that must be honoured as terminal). We
 * fold magic-fill → region/auto and drop snapshot so the merge only ever sees
 * stroke|fill|sticker|region|clear.
 */
export function sanitizeWireActions(actions: CanvasAction[]): CanvasAction[] {
  const out: CanvasAction[] = [];
  for (const a of actions) {
    const t = a.type as string;
    if (t === "snapshot") continue; // never a real action
    if (t === "magic-fill") {
      // Legacy auto-fill → region/auto (whole-page repaint, terminal).
      out.push({
        ...a,
        type: "region",
        data: { ...a.data, mode: "auto" },
      });
      continue;
    }
    if (
      t === "stroke" ||
      t === "fill" ||
      t === "sticker" ||
      t === "region" ||
      t === "clear"
    ) {
      out.push(a);
    }
    // anything else is dropped (unknown / future type)
  }
  return out;
}

/** Stamp a stable id on a legacy / id-less / positional-id action. */
function ensureId(a: CanvasAction): CanvasAction {
  if (a.id && UUID_RE.test(a.id)) return a; // already a real stable id
  if (a.id && !LEGACY_POSITIONAL_ID_RE.test(a.id)) return a; // some other stable id; trust it
  // missing OR positional `action-<ts>-<index>` → content-derived, position-free
  return { ...a, id: canonicalLegacyId(a) };
}

/** A terminal action visually supersedes ALL prior canvas content. */
function isTerminal(a: CanvasAction): boolean {
  return (a.type === "region" && a.data?.mode === "auto") || a.type === "clear";
}

/** Total order: timestamp asc, then per-device seq asc, then id asc. */
function cmp(x: CanvasAction, y: CanvasAction): number {
  if (x.timestamp !== y.timestamp) return x.timestamp - y.timestamp;
  const sx = x.data?.seq ?? 0;
  const sy = y.data?.seq ?? 0;
  if (sx !== sy) return sx - sy;
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

/**
 * Merge a local and a remote (server) action array into a single deterministic,
 * deduped, ordered, terminal-collapsed array.
 *
 * Steps:
 *  0. Sanitize both (filter to wire types, fold magic-fill, drop snapshot).
 *  1. ensureId (normalize legacy / positional ids to content ids).
 *  2. Union into a Map keyed by id — seed remote, then overlay local so LOCAL
 *     WINS on a same-id divergence (the POSTing/loading device is the live
 *     editor; the server copy is the older snapshot of that same action).
 *  3. Sort by (timestamp, seq, id) — a total order, so both clients collapse
 *     identically.
 *  4. Terminal-collapse with a cross-device skew guard: drop an action that
 *     sorts before the LAST terminal ONLY if it is same-origin-device as that
 *     terminal, or predates it by more than SKEW_WINDOW_MS. Keep everything at
 *     or after the terminal, and keep skew-ambiguous cross-device actions.
 *
 * Idempotent: mergeCanvasActions(local, mergeCanvasActions(local, remote)) deep-
 * equals mergeCanvasActions(local, remote).
 */
export function mergeCanvasActions(
  local: CanvasAction[],
  remote: CanvasAction[],
): CanvasAction[] {
  const byId = new Map<string, CanvasAction>();
  for (const a of sanitizeWireActions(remote).map(ensureId)) byId.set(a.id, a);
  for (const a of sanitizeWireActions(local).map(ensureId)) byId.set(a.id, a); // local overlays → local wins

  const sorted = [...byId.values()].sort(cmp);

  // index of the LAST terminal in sorted order
  let lastTerminal = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (isTerminal(sorted[i])) lastTerminal = i;
  }
  if (lastTerminal < 0) return sorted;

  const terminal = sorted[lastTerminal];

  // Actions sorted before the terminal that are NOT provably superseded by it
  // (cross-device + within the skew window). They are kept but must render ON
  // TOP of the terminal repaint, so they are re-positioned to just after the
  // terminal block — paint order is array order, and a terminal "auto" repaints
  // the whole page, so a kept stroke left before it would be painted over.
  const keptAmbiguous: CanvasAction[] = [];
  for (let i = 0; i < lastTerminal; i += 1) {
    const a = sorted[i];
    const sameDevice =
      !!a.data?.originDeviceId &&
      !!terminal.data?.originDeviceId &&
      a.data.originDeviceId === terminal.data.originDeviceId;
    const clearlyOlder = a.timestamp < terminal.timestamp - SKEW_WINDOW_MS;
    if (sameDevice || clearlyOlder) continue; // superseded → drop
    keptAmbiguous.push(a); // skew-ambiguous cross-device → keep, render on top
  }

  // terminal + everything sorted at/after it, then the kept-ambiguous strokes
  // on top. (keptAmbiguous retains its sorted order; the at/after block too.)
  return [...sorted.slice(lastTerminal), ...keptAmbiguous];
}
