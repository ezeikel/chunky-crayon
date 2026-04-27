import { Suspense } from 'react';
import { connection } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import { LANDING_PAGES } from '@/lib/seo/landing-pages';
import Loading from '@/components/Loading/Loading';

// Bumped on every page load so previews always re-fetch the latest render
// rather than reading the browser cache. OG routes themselves are dynamic,
// so the server work happens regardless — this just keeps the <img> fresh.
const cacheBust = () => Date.now().toString();

const OGAdminContent = async () => {
  await connection();
  await requireAdmin('notFound');

  const v = cacheBust();

  const heroEntries = [
    {
      key: 'locale-en',
      label: 'Hero collage (English)',
      sub: 'Default OG for /, /gallery/*, /tools/*, /blog, /pricing, /for-teachers, etc.',
      previewUrl: `/en/opengraph-image?v=${v}`,
      pagePath: '/en',
    },
    {
      key: 'locale-ja',
      label: 'Hero collage (Japanese)',
      sub: 'Same layout, JA tagline.',
      previewUrl: `/ja/opengraph-image?v=${v}`,
      pagePath: '/ja',
    },
  ];

  const landingEntries = LANDING_PAGES.map((p) => ({
    key: `landing-${p.slug}`,
    label: p.title,
    sub: `Tag filter: ${p.tags[0] ?? '—'} · /coloring-pages/${p.slug}`,
    previewUrl: `/en/coloring-pages/${p.slug}/opengraph-image?v=${v}`,
    pagePath: `/en/coloring-pages/${p.slug}`,
  }));

  return (
    <>
      <div className="mb-6">
        <h1 className="font-tondo text-3xl font-bold mb-2">OG previews</h1>
        <p className="text-muted-foreground">
          Live renders of the social cards used on non-coloring-image routes.
          Per-image cards live in{' '}
          <code className="text-crayon-orange">/admin/images</code>.
        </p>
      </div>

      <Section title="Hero collage" entries={heroEntries} />

      <Section
        title={`Landing pages (${landingEntries.length})`}
        entries={landingEntries}
      />
    </>
  );
};

type Entry = {
  key: string;
  label: string;
  sub: string;
  previewUrl: string;
  pagePath: string;
};

const Section = ({ title, entries }: { title: string; entries: Entry[] }) => (
  <section className="mb-10">
    <h2 className="font-tondo text-xl font-bold mb-4">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {entries.map((e) => (
        <div
          key={e.key}
          className="flex flex-col border-2 border-paper-cream-dark rounded-xl overflow-hidden bg-white"
        >
          <div className="relative aspect-[1200/630] bg-paper-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={e.previewUrl}
              alt={e.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-3 flex flex-col gap-y-1">
            <div className="font-medium text-sm">{e.label}</div>
            <div className="text-xs text-text-primary/60">{e.sub}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={e.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium px-2 py-1 rounded-full border border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
              >
                Open OG ↗
              </a>
              <a
                href={e.pagePath}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium px-2 py-1 rounded-full border border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
              >
                Open page ↗
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const OGAdminPage = () => (
  <Suspense fallback={<Loading size="lg" />}>
    <OGAdminContent />
  </Suspense>
);

export default OGAdminPage;
