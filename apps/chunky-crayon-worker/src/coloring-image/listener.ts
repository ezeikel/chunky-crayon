/**
 * Shared Postgres LISTEN connection + in-process fanout.
 *
 * Why one connection, not one-per-subscriber: pg LISTEN keeps a TCP
 * connection open for the lifetime of the listener. If every browser SSE
 * stream opened its own pg.Client, 50 concurrent users on the image page
 * would exhaust Neon's connection limit fast. Instead we hold ONE
 * connection here, LISTEN once on `coloring_image_update`, and fan each
 * notification out to in-process subscribers via an EventEmitter.
 *
 * The connection is lazy-initialised on first subscribe and held for the
 * lifetime of the worker process. On disconnect (Neon scaling, network
 * blip), the EventEmitter stays around — we reconnect underneath and
 * re-LISTEN. Subscribers don't need to know.
 *
 * Subscribers identify which row id they care about; the listener fans
 * the notification only to those subscribers (avoiding noisy "you got
 * an event for an image you're not watching" wakeups).
 */
import { EventEmitter } from "node:events";
import pg from "pg";

const CHANNEL = "coloring_image_update";

// Per-id fanout. Keys are coloring_images.id; values are EventEmitters
// that fire 'update' once per pg notify with that id.
//
// Using one emitter per id (not one global emitter with id filtering)
// because a single global with hundreds of listeners triggers Node's
// "MaxListenersExceededWarning" and forces an O(N) walk on every notify.
// Per-id, the lookup is O(1) and listener counts stay small.
const emittersById = new Map<string, EventEmitter>();

let client: pg.Client | null = null;
let connecting: Promise<pg.Client> | null = null;

const ensureListener = async (): Promise<void> => {
  if (client) return;
  if (connecting) {
    await connecting;
    return;
  }

  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    throw new Error(
      "[listener] DATABASE_URL_DIRECT not set — required for LISTEN",
    );
  }

  connecting = (async () => {
    const c = new pg.Client({ connectionString: url });

    c.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      const id = msg.payload;
      const emitter = emittersById.get(id);
      if (emitter) emitter.emit("update");
    });

    c.on("error", (err) => {
      // Best-effort reconnect on the next subscribe. We can't re-LISTEN on
      // a dead connection so we drop the ref and let ensureListener re-do
      // setup. Active subscribers will miss notifies until then; their
      // EventSource (browser-side) will reconnect on stream close, which
      // re-reads the row to recover state.
      console.error("[listener] pg.Client error:", err.message);
      client = null;
      connecting = null;
    });

    await c.connect();
    await c.query(`LISTEN ${CHANNEL}`);
    console.log("[listener] connected + LISTENing on", CHANNEL);
    client = c;
    return c;
  })();

  await connecting;
};

/**
 * Subscribe to row updates for a single coloring_images.id.
 *
 * Returns an unsubscribe function that the caller must invoke on stream
 * close — otherwise the EventEmitter accumulates dead listeners.
 */
export const subscribe = async (
  id: string,
  onUpdate: () => void,
): Promise<() => void> => {
  await ensureListener();

  let emitter = emittersById.get(id);
  if (!emitter) {
    emitter = new EventEmitter();
    // Bumping max listeners — multiple tabs / devices on the same page
    // each open their own SSE, and we don't want the warning to flood
    // logs. Realistically this stays in single digits per id.
    emitter.setMaxListeners(50);
    emittersById.set(id, emitter);
  }

  emitter.on("update", onUpdate);

  return () => {
    emitter!.off("update", onUpdate);
    if (emitter!.listenerCount("update") === 0) {
      emittersById.delete(id);
    }
  };
};
