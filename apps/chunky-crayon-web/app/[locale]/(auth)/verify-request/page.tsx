import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import VerifyRequestCard from '@/components/auth/VerifyRequestCard';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

const VerifyRequestPage = async ({ params }: Props) => {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex items-center justify-center">
      <VerifyRequestCard />
    </div>
  );
};

export default VerifyRequestPage;
