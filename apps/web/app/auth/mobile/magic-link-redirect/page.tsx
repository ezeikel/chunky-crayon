'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MagicLinkRedirectContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No token provided');
      return;
    }

    // Verify the token and get session
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/mobile/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify magic link');
        }

        // Success - redirect to the app with the session token
        // Try deep link first, then fall back to showing success
        const appScheme = 'chunkycrayon';
        const deepLink = `${appScheme}://auth/callback?token=${encodeURIComponent(data.token)}`;

        // Try to open the app
        window.location.href = deepLink;

        // If we're still here after a short delay, show success message
        setTimeout(() => {
          setStatus('success');
        }, 1000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
      {status === 'loading' && (
        <>
          <div className="text-6xl mb-4">🖍️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Signing you in...
          </h1>
          <p className="text-gray-600">
            Please wait while we verify your magic link.
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent mx-auto"></div>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            You&apos;re signed in!
          </h1>
          <p className="text-gray-600 mb-6">
            You can now return to the Chunky Crayon app.
          </p>
          <p className="text-sm text-gray-500">
            If the app didn&apos;t open automatically, please open it manually.
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Something went wrong with your magic link.'}
          </p>
          <p className="text-sm text-gray-500">
            Magic links expire after 15 minutes. Please try signing in again
            from the app.
          </p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
      <div className="text-6xl mb-4">🖍️</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
      <div className="mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}

export default function MagicLinkRedirectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-yellow-100 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <MagicLinkRedirectContent />
      </Suspense>
    </div>
  );
}
