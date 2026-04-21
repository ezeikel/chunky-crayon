import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guards';
import Loading from '@/components/Loading/Loading';

const PAGE_SIZE = 60;

type PageSearchParams = Promise<{
  page?: string;
  type?: 'all' | 'user' | 'daily';
  status?: 'all' | 'ready' | 'missing';
}>;

const AdminImagesContent = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  // Must come before auth() / DB reads so Cache Components knows the page
  // is dynamic per request.
  await connection();
  await requireAdmin();

  const { page: pageParam, type, status } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const generationTypeFilter =
    type === 'user'
      ? { generationType: 'USER' as const }
      : type === 'daily'
        ? { generationType: 'DAILY' as const }
        : {};

  const regionFilter =
    status === 'ready'
      ? { regionMapUrl: { not: null } }
      : status === 'missing'
        ? { regionMapUrl: null }
        : {};

  const [images, totalCount] = await Promise.all([
    db.coloringImage.findMany({
      where: {
        brand: BRAND,
        ...generationTypeFilter,
        ...regionFilter,
      },
      select: {
        id: true,
        title: true,
        url: true,
        svgUrl: true,
        regionMapUrl: true,
        regionsGeneratedAt: true,
        generationType: true,
        createdAt: true,
        User: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    db.coloringImage.count({
      where: {
        brand: BRAND,
        ...generationTypeFilter,
        ...regionFilter,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <>
      <div className="mb-6">
        <h1 className="font-tondo text-3xl font-bold mb-2">Images</h1>
        <p className="text-muted-foreground">
          {totalCount.toLocaleString()} total · page {page}/{totalPages}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <FilterGroup
          label="Type"
          current={type ?? 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'user', label: 'User' },
            { value: 'daily', label: 'Daily' },
          ]}
          queryKey="type"
          currentSearchParams={{ type, status }}
        />
        <FilterGroup
          label="Region store"
          current={status ?? 'all'}
          options={[
            { value: 'all', label: 'All' },
            { value: 'ready', label: 'Ready' },
            { value: 'missing', label: 'Missing' },
          ]}
          queryKey="status"
          currentSearchParams={{ type, status }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img) => {
          const thumb = img.svgUrl || img.url;
          const hasRegion = !!img.regionMapUrl;
          return (
            <div
              key={img.id}
              className="flex flex-col border-2 border-paper-cream-dark rounded-xl overflow-hidden bg-white"
            >
              <Link
                href={`/coloring-image/${img.id}`}
                className="relative aspect-square bg-paper-cream block"
              >
                {thumb && (
                  <Image
                    src={thumb}
                    alt={img.title ?? 'coloring image'}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 50vw, 20vw"
                    unoptimized
                  />
                )}
                <span
                  className={`absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    hasRegion
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-amber-500/90 text-white'
                  }`}
                >
                  {hasRegion ? '🗺️ region' : '⚠ no region'}
                </span>
                <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/60 text-white">
                  {img.generationType}
                </span>
              </Link>
              <div className="p-2 flex flex-col gap-y-1 text-xs">
                <div
                  className="font-medium line-clamp-2"
                  title={img.title ?? ''}
                >
                  {img.title ?? '(no title)'}
                </div>
                <div className="text-text-primary/50">
                  {img.User?.email ?? '(anonymous)'}
                </div>
                <div className="text-text-primary/50">
                  {img.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                </div>
                <Link
                  href={`/dev/region-store/${img.id}`}
                  className="mt-1 inline-flex items-center justify-center gap-x-1 rounded-full border border-paper-cream-dark px-2 py-1 text-[11px] font-medium text-text-primary/80 hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
                >
                  🗺️ View region store
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-8 text-sm">
        {page > 1 && (
          <Link
            href={buildHref({ type, status, page: page - 1 })}
            className="px-3 py-1.5 rounded-full border-2 border-paper-cream-dark hover:border-crayon-orange/50"
          >
            ← Prev
          </Link>
        )}
        <span className="px-3 py-1.5 text-text-primary/70">
          Page {page} of {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={buildHref({ type, status, page: page + 1 })}
            className="px-3 py-1.5 rounded-full border-2 border-paper-cream-dark hover:border-crayon-orange/50"
          >
            Next →
          </Link>
        )}
      </div>
    </>
  );
};

const FilterGroup = ({
  label,
  current,
  options,
  queryKey,
  currentSearchParams,
}: {
  label: string;
  current: string;
  options: { value: string; label: string }[];
  queryKey: 'type' | 'status';
  currentSearchParams: { type?: string; status?: string };
}) => (
  <div className="flex items-center gap-1">
    <span className="text-text-primary/60 font-medium">{label}:</span>
    {options.map((opt) => {
      const active = current === opt.value;
      const href = buildHref({
        ...currentSearchParams,
        [queryKey]: opt.value === 'all' ? undefined : opt.value,
        page: 1,
      });
      return (
        <Link
          key={opt.value}
          href={href}
          className={`px-2.5 py-1 rounded-full border-2 text-xs transition-colors ${
            active
              ? 'bg-crayon-orange text-white border-crayon-orange'
              : 'border-paper-cream-dark text-text-primary/70 hover:border-crayon-orange/50'
          }`}
        >
          {opt.label}
        </Link>
      );
    })}
  </div>
);

const buildHref = (params: {
  type?: string;
  status?: string;
  page?: number;
}): string => {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.status) qs.set('status', params.status);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const s = qs.toString();
  return s ? `/admin/images?${s}` : '/admin/images';
};

const AdminImagesPage = ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => (
  <div className="container mx-auto p-8 max-w-7xl">
    <Suspense fallback={<Loading size="lg" />}>
      <AdminImagesContent searchParams={searchParams} />
    </Suspense>
  </div>
);

export default AdminImagesPage;
