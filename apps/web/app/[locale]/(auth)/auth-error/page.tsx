import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

const AuthErrorPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);

  return (
    <div className="flex items-center justify-center">
      <AuthErrorCard error={error} />
    </div>
  );
};

export default AuthErrorPage;
