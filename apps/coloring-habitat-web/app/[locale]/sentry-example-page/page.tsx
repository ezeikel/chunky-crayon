"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Sentry Example Page</h1>
      <p className="text-muted-foreground">
        Click the button below to trigger a test error that will be sent to
        Sentry.
      </p>
      <button
        type="button"
        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        onClick={() => {
          Sentry.startSpan(
            { name: "Example Frontend Span", op: "test" },
            () => {
              const error = new Error(
                "This is a Sentry test error from Coloring Habitat",
              );
              Sentry.captureException(error);
              throw error;
            },
          );
        }}
      >
        Throw Test Error
      </button>
    </div>
  );
}
