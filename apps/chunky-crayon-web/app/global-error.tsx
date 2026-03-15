'use client';

import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
    // PostHog error tracking
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={undefined as any} />
      </body>
    </html>
  );
}
