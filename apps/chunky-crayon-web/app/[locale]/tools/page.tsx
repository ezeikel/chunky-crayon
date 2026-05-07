import { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faStar } from '@fortawesome/pro-duotone-svg-icons/faStar';
import { faMarker } from '@fortawesome/pro-duotone-svg-icons/faMarker';
import { faCakeCandles } from '@fortawesome/pro-duotone-svg-icons/faCakeCandles';
import { faBookOpen } from '@fortawesome/pro-duotone-svg-icons/faBookOpen';
import { faCalendarStar } from '@fortawesome/pro-duotone-svg-icons/faCalendarStar';
import { generateAlternates } from '@/lib/seo';
import ViewContentTracker from '@/components/ViewContentTracker/ViewContentTracker';

type PageParams = { locale: string };

// Duotone icon palette — mirrors the convention in InputModeSelector so
// tool cards read as part of the same visual family.
const DUOTONE_STYLE = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-teal))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

const HUB_PATH = '/tools';
const HUB_DESCRIPTION =
  'Free printable tools for ages 3–8: personalized reward charts, coloring pages, birthday invites, ABC worksheets and more. No signup required.';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Free Printable Tools for Parents & Teachers | Chunky Crayon',
    description: HUB_DESCRIPTION,
    alternates: generateAlternates(locale, HUB_PATH),
    openGraph: {
      title: 'Free Printable Tools for Parents & Teachers',
      description: HUB_DESCRIPTION,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${HUB_PATH}`,
    },
  };
}

type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: IconDefinition;
  available: boolean;
};

const TOOLS: Tool[] = [
  {
    slug: 'reward-chart',
    title: 'Reward Chart Maker',
    description:
      'Printable behavior / potty / bedtime chart. Pick a theme, add behaviors, download.',
    icon: faStar,
    available: true,
  },
  {
    slug: 'name',
    title: 'Name Coloring Pages',
    description:
      "Personalised coloring page with your child's name in bubble letters.",
    icon: faMarker,
    available: true,
  },
  {
    slug: 'birthday-invite',
    title: 'Birthday Invite Maker',
    description:
      'Themed printable invites your kid can help color in. Add party details, print 1-up or 4-up.',
    icon: faCakeCandles,
    available: true,
  },
  {
    slug: 'abc-tracing',
    title: 'ABC Tracing Worksheets',
    description:
      'A–Z alphabet tracing pages with themed pictures. 27-page PDF bundle, great for preschool and kindergarten.',
    icon: faBookOpen,
    available: true,
  },
  {
    slug: 'seasonal-pack',
    title: 'Seasonal Coloring Packs',
    description:
      'Halloween, Christmas, Easter and more. Ready-to-print bundles of themed coloring pages.',
    icon: faCalendarStar,
    available: true,
  },
];

const ToolsHubPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale } = await params;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Chunky Crayon Free Printable Tools',
    itemListElement: TOOLS.filter((t) => t.available).map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://chunkycrayon.com/${locale}/tools/${tool.slug}`,
      name: tool.title,
    })),
  };

  return (
    <>
      <ViewContentTracker contentType="tools_index" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <div className="max-w-5xl mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="font-tondo text-4xl font-extrabold mb-3 text-primary">
            Free Printable Tools
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quick, no-signup printables for parents, grandparents, and teachers
            of young kids (ages 3–8). All COPPA-safe, nothing you type is saved
            on our servers.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const card = (
              <div
                key={tool.slug}
                className="h-full flex flex-col gap-3 p-6 bg-white rounded-2xl border-2 border-paper-cream-dark transition hover:border-crayon-orange hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <FontAwesomeIcon
                    icon={tool.icon}
                    className="text-3xl"
                    style={DUOTONE_STYLE}
                  />
                  {!tool.available && (
                    <span className="text-xs font-tondo font-bold text-crayon-orange bg-crayon-orange/10 px-2 py-1 rounded-full">
                      Coming soon
                    </span>
                  )}
                </div>
                <h2 className="font-tondo text-2xl font-bold text-primary">
                  {tool.title}
                </h2>
                <p className="text-muted-foreground flex-1">
                  {tool.description}
                </p>
              </div>
            );
            return tool.available ? (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="block"
              >
                {card}
              </Link>
            ) : (
              <div key={tool.slug}>{card}</div>
            );
          })}
        </div>

        <section className="text-center mt-16">
          <Link
            href="/for-teachers"
            className="font-tondo text-crayon-orange hover:underline"
          >
            Teaching? Check the teacher hub →
          </Link>
        </section>
      </div>
    </>
  );
};

export default ToolsHubPage;
