import { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import { buildToolSchema } from '@/lib/seo/tool-schema';
import AbcTracingForm from './AbcTracingForm';

type PageParams = { locale: string };

const TOOL_NAME = 'ABC Tracing Worksheets';
const TOOL_DESCRIPTION =
  'Free 27-page printable A–Z alphabet tracing bundle for preschool and kindergarten. Each page has the letter to trace, a matching word and picture. Print-ready PDF.';
const TOOL_PATH = '/tools/abc-tracing';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      'Free Printable ABC Tracing Worksheets (A–Z) for Preschool | Chunky Crayon',
    description: TOOL_DESCRIPTION,
    alternates: generateAlternates(locale, TOOL_PATH),
    openGraph: {
      title: 'Free Printable ABC Tracing Worksheets (A–Z)',
      description:
        'Preschool alphabet bundle — 26 letter pages + cover. Trace the letter, learn the word, colour the picture.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${TOOL_PATH}`,
    },
  };
}

const AbcTracingPage = async ({ params }: { params: Promise<PageParams> }) => {
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
            Free ABC Tracing Worksheets
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A full A–Z bundle of printable tracing pages — each letter paired
            with a word, a picture to colour, and a row for handwriting
            practice. Perfect for preschool and early primary.
          </p>
        </header>

        <AbcTracingForm />

        <section className="mt-16 space-y-4 text-sm text-muted-foreground max-w-2xl mx-auto">
          <h2 className="font-tondo font-bold text-xl text-primary">
            What&apos;s in the bundle
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cover page (personalised if you add a name)</li>
            <li>26 letter pages, A through Z, landscape letter-size</li>
            <li>A matching word and picture per letter (Apple, Ball, Cat…)</li>
            <li>A row of smaller letters to trace for handwriting practice</li>
          </ul>
          <p className="pt-4">
            No signup. Names stay in your browser — nothing is stored on our
            servers.
          </p>
        </section>
      </div>
    </>
  );
};

export default AbcTracingPage;
