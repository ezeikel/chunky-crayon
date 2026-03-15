import { Suspense } from 'react';
import { routing } from '@/i18n/routing';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Non-async page component to avoid prerendering issues (static shell)
const AuthErrorPage = ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 rounded-lg w-96 h-64" />
        </div>
      }
    >
      <AuthErrorContent searchParams={searchParams} />
    </Suspense>
  );
};

// Async wrapper that handles searchParams inside Suspense
async function AuthErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex items-center justify-center">
      <AuthErrorCard error={error} />
    </div>
  );
}

export default AuthErrorPage;
