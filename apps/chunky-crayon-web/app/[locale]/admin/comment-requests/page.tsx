import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { connection } from 'next/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/pro-duotone-svg-icons';
import { faInstagram, faFacebookF } from '@fortawesome/free-brands-svg-icons';
import { db } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';
import Loading from '@/components/Loading/Loading';
import { getColoringImageCanonicalUrl } from '@/lib/seo/coloring-image-url';
import { buildImageDmMessage } from '@/lib/image-request';
import DmComposer from './DmComposer';

const PAGE_SIZE = 50;

type PageSearchParams = Promise<{
  page?: string;
  status?: string;
  type?: string;
}>;

// Status → badge colour. Mirrors the lifecycle in
// docs/comment-image-requests: PENDING → PROCESSING → AWAITING_GENERATION
// → DM_SENT (success) | REPLIED (auto-reply success) | SKIPPED | FAILED.
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  AWAITING_GENERATION: 'bg-purple-100 text-purple-800',
  DM_SENT: 'bg-green-100 text-green-800',
  REPLIED: 'bg-green-100 text-green-800',
  LIKED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
};

const AdminCommentRequestsContent = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  // Before any DB read so Cache Components treats this as dynamic.
  await connection();
  await requireAdmin('notFound');

  const { page: pageParam, status, type } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const statusFilter =
    status && status !== 'all' ? { status: status as never } : {};
  const typeFilter =
    type === 'image'
      ? { commentType: 'IMAGE_REQUEST' as const }
      : type === 'reply'
        ? { commentType: { not: 'IMAGE_REQUEST' as const } }
        : {};

  const [rows, totalCount, statusCounts] = await Promise.all([
    db.socialCommentQueue.findMany({
      where: { ...statusFilter, ...typeFilter },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        platform: true,
        commentText: true,
        authorUsername: true,
        status: true,
        commentType: true,
        extractedPrompt: true,
        coloringImageId: true,
        dmSent: true,
        imageDmSent: true,
        replyText: true,
        errorMessage: true,
        retryCount: true,
        createdAt: true,
        processedAt: true,
      },
    }),
    db.socialCommentQueue.count({ where: { ...statusFilter, ...typeFilter } }),
    db.socialCommentQueue.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  // Hydrate linked ColoringImage rows for thumbnails (image-request rows).
  const imageIds = rows
    .map((r) => r.coloringImageId)
    .filter((id): id is string => !!id);
  const images = imageIds.length
    ? await db.coloringImage.findMany({
        where: { id: { in: imageIds } },
        select: {
          id: true,
          url: true,
          status: true,
          slugBase: true,
          userId: true,
          showInCommunity: true,
        },
      })
    : [];
  const imageById = new Map(images.map((i) => [i.id, i]));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    sp.set('page', String(p));
    if (status) sp.set('status', status);
    if (type) sp.set('type', type);
    return `/admin/comment-requests?${sp.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <FontAwesomeIcon
          icon={faComments}
          className="text-crayon-orange text-2xl"
        />
        <h1 className="text-2xl font-bold">Comment requests</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Inbound IG/FB comments. <code>#drawthis</code> requests generate a
        coloring page and deliver it (IG: Private Reply DM, FB: comment link).
        All other comments get an AI auto-reply. {totalCount} total.
      </p>

      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        {statusCounts.map((s) => (
          <span
            key={s.status}
            className={`px-2 py-1 rounded-full ${
              STATUS_STYLES[s.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.status}: {s._count._all}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">Comment / prompt</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Image</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No comment requests yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const img = r.coloringImageId
                  ? imageById.get(r.coloringImageId)
                  : null;
                const isImageReq = r.commentType === 'IMAGE_REQUEST';
                return (
                  <tr key={r.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {r.createdAt.toISOString().slice(5, 16).replace('T', ' ')}
                    </td>
                    <td className="px-3 py-2">
                      <FontAwesomeIcon
                        icon={
                          r.platform === 'INSTAGRAM' ? faInstagram : faFacebookF
                        }
                        className={
                          r.platform === 'INSTAGRAM'
                            ? 'text-pink-600'
                            : 'text-blue-600'
                        }
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      @{r.authorUsername ?? '—'}
                    </td>
                    <td className="px-3 py-2 max-w-sm">
                      <div className="text-gray-900">{r.commentText}</div>
                      {isImageReq && r.extractedPrompt && (
                        <div className="mt-1 text-xs text-purple-700">
                          prompt: {r.extractedPrompt}
                        </div>
                      )}
                      {!isImageReq && r.replyText && (
                        <div className="mt-1 text-xs text-green-700">
                          reply: {r.replyText}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.retryCount > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ×{r.retryCount}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {img?.url ? (
                        <Link
                          href={`/en/coloring-image/${img.id}`}
                          className="block"
                        >
                          <Image
                            src={img.url}
                            alt={r.extractedPrompt ?? 'coloring page'}
                            width={48}
                            height={48}
                            className="rounded border border-gray-200 object-cover"
                          />
                        </Link>
                      ) : isImageReq ? (
                        <span className="text-xs text-gray-400">
                          {img?.status ?? 'none'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      {isImageReq &&
                        img?.url &&
                        img.status === 'READY' &&
                        r.status !== 'DM_SENT' && (
                          <DmComposer
                            queueRowId={r.id}
                            recipient={r.authorUsername ?? ''}
                            message={buildImageDmMessage(
                              getColoringImageCanonicalUrl(
                                {
                                  id: img.id,
                                  slugBase: img.slugBase,
                                  userId: img.userId,
                                  showInCommunity: img.showInCommunity,
                                  status: img.status,
                                },
                                'en',
                              ),
                            )}
                          />
                        )}
                      {r.errorMessage && (
                        <div className="mt-1 text-xs text-red-600 break-words">
                          {r.errorMessage}
                        </div>
                      )}
                      {isImageReq && (
                        <div className="mt-1 text-xs text-gray-400">
                          dm:{r.dmSent ? 'y' : 'n'} img:
                          {r.imageDmSent ? 'y' : 'n'}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="px-3 py-1 rounded border border-gray-300"
            >
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className="px-3 py-1 rounded border border-gray-300"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
};

const AdminCommentRequestsPage = ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => (
  <Suspense fallback={<Loading />}>
    <AdminCommentRequestsContent searchParams={searchParams} />
  </Suspense>
);

export default AdminCommentRequestsPage;
