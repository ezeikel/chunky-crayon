import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import Loading from '@/components/Loading/Loading';
import { getProfiles, getActiveProfile } from '@/app/actions/profiles';
import ProfilesManager from './ProfilesManager';

// Async component that handles auth, data fetching, and translations
const ProfilesContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const [profiles, activeProfile, t] = await Promise.all([
    getProfiles().then((p) => p || []),
    getActiveProfile(),
    getTranslations('profiles'),
  ]);

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="font-tondo text-3xl font-bold mb-2">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>
      </div>
      <ProfilesManager profiles={profiles} activeProfile={activeProfile} />
    </>
  );
};

const ProfilesPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Suspense fallback={<Loading size="lg" />}>
        <ProfilesContent />
      </Suspense>
    </div>
  );
};

export default ProfilesPage;
