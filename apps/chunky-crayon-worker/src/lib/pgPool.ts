/**
 * Direct pg.Pool for write paths that have hung on the PrismaNeon
 * WebSocket adapter.
 *
 * The PrismaNeon adapter holds a long-lived WebSocket and will silently
 * go half-open if the event loop stalls during long CPU-bound work
 * (region-store generation does ~3-4min of canvas work + 4 palette
 * variants in series). Subsequent Prisma writes hang on the dead socket
 * indefinitely; the existing 30s-timeout-then-$disconnect retry doesn't
 * recover because $disconnect waits for pending queries.
 *
 * Solution: bypass Prisma for the one risky write. pg.Pool acquires a
 * fresh TCP connection per query, releases it back. No half-open
 * WebSocket. Uses DATABASE_URL_DIRECT (non-pooled / non-PgBouncer) so
 * each connection talks straight to Neon's compute, same as the
 * pg_notify client.
 */
import pg from "pg";

let _pool: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    throw new Error(
      "[pgPool] DATABASE_URL_DIRECT not set — required for direct write paths",
    );
  }

  _pool = new pg.Pool({
    connectionString: url,
    // Small pool — direct write paths are rare. Most worker DB work
    // still flows through Prisma's adapter pool.
    max: 4,
    // Keep connections short — a fresh TCP per cluster of writes is
    // fine here, and prevents the same idle-WebSocket pattern.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  _pool.on("error", (err) => {
    console.error("[pgPool] unexpected pool error:", err);
  });

  return _pool;
}
