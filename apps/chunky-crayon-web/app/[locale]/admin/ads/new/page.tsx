import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-duotone-svg-icons';
import { requireAdmin } from '@/lib/auth-guards';
import Loading from '@/components/Loading/Loading';
import CreateAdForm from '../_components/CreateAdForm';

const NewAdContent = async () => {
  // Cache Components: gate inside Suspense so cookies()/auth() doesn't
  // trip the "uncached data outside <Suspense>" prerender check.
  await connection();
  await requireAdmin('notFound');

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/ads"
        className="inline-flex items-center gap-2 font-rooney-sans text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to ads
      </Link>
      <h1 className="font-tondo text-3xl font-bold mb-1">New ad</h1>
      <p className="font-rooney-sans text-text-secondary mb-8">
        Generate a coloring image and tag it for a campaign. Goes through the
        full pipeline (AI gen → SVG → QR → derived assets) — no backfill needed.
      </p>
      <CreateAdForm />
    </div>
  );
};

const NewAdPage = () => (
  <Suspense fallback={<Loading size="lg" />}>
    <NewAdContent />
  </Suspense>
);

export default NewAdPage;
