import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Loading from '@/components/Loading/Loading';
import { getProfiles, getActiveProfile } from '@/app/actions/profiles';
import ProfilesManager from './ProfilesManager';

// Async component that handles auth and data fetching
const ProfilesContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const profiles = (await getProfiles()) || [];
  const activeProfile = await getActiveProfile();

  return <ProfilesManager profiles={profiles} activeProfile={activeProfile} />;
};

const ProfilesPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="font-tondo text-3xl font-bold mb-2">Manage Profiles</h1>
        <p className="text-muted-foreground">
          Create and manage profiles for your family members
        </p>
      </div>

      <Suspense fallback={<Loading size="lg" />}>
        <ProfilesContent />
      </Suspense>
    </div>
  );
};

export default ProfilesPage;
