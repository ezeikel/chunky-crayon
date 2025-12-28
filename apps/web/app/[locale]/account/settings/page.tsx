import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import Loading from '@/components/Loading/Loading';
import SettingsForm from './SettingsForm';
import LanguageSettings from './LanguageSettings';
import { getUserSettings } from '@/app/actions/settings';

// Async component that handles auth, data fetching, and translations
const SettingsContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const [t, settings] = await Promise.all([
    getTranslations('settings'),
    getUserSettings(),
  ]);

  return (
    <>
      <h1 className="font-tondo text-3xl font-bold mb-2">{t('pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('pageSubtitle')}
      </p>
      <div className="space-y-6">
        <LanguageSettings />
        <SettingsForm initialSettings={settings} />
      </div>
    </>
  );
};

const SettingsPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Suspense fallback={<Loading size="lg" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
};

export default SettingsPage;
