import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import SignInOptions from '@/components/buttons/SignInOptions/SignInOptions';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

const SignInPage = async ({ params }: Props) => {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex w-full min-w-0 items-center justify-center overflow-x-hidden px-4 py-6">
      <SignInOptions />
    </div>
  );
};

export default SignInPage;
