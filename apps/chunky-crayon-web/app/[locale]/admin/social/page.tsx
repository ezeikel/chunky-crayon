import { Suspense } from 'react';
import { connection } from 'next/server';
import Loading from '@/components/Loading/Loading';
import { db } from '@one-colored-pixel/db';
import SocialConnections from './SocialConnections';

const getSocialTokenStatus = async () => {
  const [pinterestToken, tiktokToken] = await Promise.all([
    db.apiToken.findUnique({ where: { provider: 'pinterest' } }),
    db.apiToken.findUnique({ where: { provider: 'tiktok' } }),
  ]);

  return {
    pinterest: pinterestToken
      ? {
          connected: true,
          expiresAt: pinterestToken.expiresAt,
          scopes: pinterestToken.scopes,
        }
      : { connected: false },
    tiktok: tiktokToken
      ? {
          connected: true,
          expiresAt: tiktokToken.expiresAt,
          scopes: tiktokToken.scopes,
        }
      : { connected: false },
  };
};

const AdminSocialContent = async () => {
  // Cache Components: opt into dynamic render before DB reads.
  // Admin gate is in /admin/layout.tsx — no per-page guard needed.
  await connection();

  const tokenStatus = await getSocialTokenStatus();

  return (
    <>
      <h1 className="font-tondo text-3xl font-bold mb-2">
        Social Media Connections
      </h1>
      <p className="text-muted-foreground mb-8">
        Connect your social media accounts for automated posting. These
        connections are used by the daily cron job to post coloring pages.
      </p>

      <SocialConnections initialStatus={tokenStatus} />
    </>
  );
};

const AdminSocialPage = () => {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <Suspense fallback={<Loading size="lg" />}>
        <AdminSocialContent />
      </Suspense>
    </div>
  );
};

export default AdminSocialPage;
