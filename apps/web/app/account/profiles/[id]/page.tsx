import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import Loading from '@/components/Loading/Loading';
import { getProfile, getProfiles } from '@/app/actions/profiles';
import ProfileEditForm from './ProfileEditForm';

type ProfileEditPageProps = {
  params: Promise<{ id: string }>;
};

// Async component that handles auth, params unwrapping, and data fetching
const ProfileEditContent = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const [profile, allProfiles] = await Promise.all([
    getProfile(id),
    getProfiles(),
  ]);

  if (!profile) {
    notFound();
  }

  // Can only delete if there are multiple profiles
  const canDelete = (allProfiles?.length ?? 0) > 1;

  return <ProfileEditForm profile={profile} canDelete={canDelete} />;
};

const ProfileEditPage = ({ params }: ProfileEditPageProps) => {
  return (
    <div className="container mx-auto p-8 max-w-lg">
      <div className="mb-6">
        <Link
          href="/account/profiles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-crayon-orange transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Profiles
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="font-tondo text-3xl font-bold mb-2">Edit Profile</h1>
        <p className="text-muted-foreground">
          Update profile settings and preferences
        </p>
      </div>

      <Suspense fallback={<Loading size="lg" />}>
        <ProfileEditContent params={params} />
      </Suspense>
    </div>
  );
};

export default ProfileEditPage;
