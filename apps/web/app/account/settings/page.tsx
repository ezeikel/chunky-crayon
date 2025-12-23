import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Loading from '@/components/Loading/Loading';
import SettingsForm from './SettingsForm';
import { getUserSettings } from '@/app/actions/settings';

// Async component that handles auth and data fetching
const SettingsContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const settings = await getUserSettings();

  return <SettingsForm initialSettings={settings} />;
};

const SettingsPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="font-tondo text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences
      </p>

      <Suspense fallback={<Loading size="lg" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
};

export default SettingsPage;
