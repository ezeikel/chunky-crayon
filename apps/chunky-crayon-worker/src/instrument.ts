// Sentry must be initialised BEFORE any other module is imported so its
// auto-instrumentation can patch the runtime. Keep this file as the very
// first import in src/index.ts — `import "./instrument.js";` on line 1.
//
// We use @sentry/bun (not @sentry/node) because the worker runs on Bun
// in prod (see deploy/chunky-crayon-worker.service). Mirrors PTP's
// parking-ticket-pal-worker convention.
import * as Sentry from "@sentry/bun";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV || "production",
    // Lower sample rate than web because the worker handles a lot of
    // long-running render jobs — full sampling would balloon transaction
    // volume. Matches parking-ticket-pal-worker (0.1 in prod) so both
    // workers on the shared Hetzner box have the same sampling profile.
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    beforeSend(event) {
      event.tags = { ...event.tags, service: "chunky-crayon-worker" };
      return event;
    },
  });
  console.log(
    `[sentry] initialised for environment: ${process.env.NODE_ENV || "production"}`,
  );
} else {
  // Surface the misconfig loudly. In prod the systemd EnvironmentFile
  // must include SENTRY_DSN — see deploy/chunky-crayon-worker.service.
  console.warn(
    "[sentry] SENTRY_DSN not set — error reporting disabled for this run.",
  );
}

export { Sentry };
