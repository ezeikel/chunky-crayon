import { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import { buildToolSchema } from '@/lib/seo/tool-schema';
import RewardChartForm from './RewardChartForm';

type PageParams = { locale: string };

const TOOL_NAME = 'Reward Chart Maker';
const TOOL_DESCRIPTION =
  "Make a free printable reward chart in seconds. Pick a theme, add your child's name and behaviors, download the PDF. No signup. Great for potty training, bedtime, chores and classroom behavior.";
const TOOL_PATH = '/tools/reward-chart';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `Free Printable Reward Chart Maker for Kids | Chunky Crayon`,
    description: TOOL_DESCRIPTION,
    alternates: generateAlternates(locale, TOOL_PATH),
    openGraph: {
      title: 'Free Printable Reward Chart Maker for Kids',
      description:
        "Free PDF reward chart. Add your child's name + behaviors, pick a theme, print it. No signup required.",
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${TOOL_PATH}`,
    },
  };
}

const RewardChartPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale } = await params;
  const schema = buildToolSchema({
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    path: TOOL_PATH,
    locale,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <header className="text-center mb-10">
          <h1 className="font-tondo text-4xl font-extrabold mb-3 text-primary">
            Free Printable Reward Chart Maker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick a theme, add your child&apos;s name and the behaviors
            you&apos;re tracking, and download a ready-to-print PDF. Works great
            for potty training, bedtime routines, classroom jobs and chores.
          </p>
        </header>

        <RewardChartForm />

        <section className="mt-16 space-y-4 text-sm text-muted-foreground max-w-2xl mx-auto">
          <h2 className="font-tondo font-bold text-xl text-primary">
            How it works
          </h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Pick one of five themes.</li>
            <li>
              Type your child&apos;s name and up to 7 behaviors (bedtime,
              brushing teeth, sharing toys, etc.).
            </li>
            <li>Choose 5 weekdays or 7 full days.</li>
            <li>Hit Download. Print. Stick it on the fridge.</li>
          </ol>
          <p className="pt-4">
            Nothing is saved on our servers — your child&apos;s name never
            leaves your browser.
          </p>
        </section>
      </div>
    </>
  );
};

export default RewardChartPage;
