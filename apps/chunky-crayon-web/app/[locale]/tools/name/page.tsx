import { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import { buildToolSchema } from '@/lib/seo/tool-schema';
import NameGeneratorForm from './NameGeneratorForm';

type PageParams = { locale: string };

const TOOL_NAME = 'Personalised Name Coloring Pages';
const TOOL_DESCRIPTION =
  "Create a free coloring page with your child's name in big bubble letters. Pick a theme (animals, unicorns, dinosaurs, space…), generate, print. No signup.";
const TOOL_PATH = '/tools/name';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Free Personalised Name Coloring Pages for Kids | Chunky Crayon',
    description: TOOL_DESCRIPTION,
    alternates: generateAlternates(locale, TOOL_PATH),
    openGraph: {
      title: 'Free Personalised Name Coloring Pages',
      description:
        "Custom coloring page with your child's name + a fun theme. Free to print.",
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${TOOL_PATH}`,
    },
  };
}

const NameToolPage = async ({ params }: { params: Promise<PageParams> }) => {
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
            Free Personalised Name Coloring Page
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Type your child&apos;s name, pick a theme, and we&apos;ll generate a
            free bubble-letter coloring page they can print and colour in.
          </p>
        </header>

        <NameGeneratorForm />

        <section className="mt-16 space-y-4 text-sm text-muted-foreground max-w-2xl mx-auto">
          <h2 className="font-tondo font-bold text-xl text-primary">
            Great for
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>First day of school or nursery</li>
            <li>Birthday party placemats</li>
            <li>Rainy afternoon activity</li>
            <li>Quiet-time on long car journeys</li>
          </ul>
          <p className="pt-4">
            Your child&apos;s name is only used to build the image. We
            don&apos;t store it separately.
          </p>
        </section>
      </div>
    </>
  );
};

export default NameToolPage;
