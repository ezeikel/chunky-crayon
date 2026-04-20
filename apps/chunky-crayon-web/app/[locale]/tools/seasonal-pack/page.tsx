import { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import { buildToolSchema } from '@/lib/seo/tool-schema';
import SeasonalPackForm from './SeasonalPackForm';

type PageParams = { locale: string };

const TOOL_NAME = 'Seasonal Coloring Packs';
const TOOL_DESCRIPTION =
  'Free printable seasonal coloring page bundles — Halloween, Christmas, Valentine’s, Easter, Thanksgiving and Back-to-school. 6–10 themed pages per pack. No signup.';
const TOOL_PATH = '/tools/seasonal-pack';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      'Free Seasonal Coloring Packs — Halloween, Christmas, Easter & More | Chunky Crayon',
    description: TOOL_DESCRIPTION,
    alternates: generateAlternates(locale, TOOL_PATH),
    openGraph: {
      title: 'Free Seasonal Coloring Packs',
      description:
        'Pick a holiday, download a ready-to-print coloring bundle. 6–10 pages per pack.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${TOOL_PATH}`,
    },
  };
}

const SeasonalPackPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
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
            Free Seasonal Coloring Packs
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick a holiday, optionally add your child&apos;s name, download a
            ready-to-print PDF bundle. Works great as a quiet-time activity pack
            or classroom set.
          </p>
        </header>

        <SeasonalPackForm />

        <section className="mt-16 space-y-4 text-sm text-muted-foreground max-w-2xl mx-auto">
          <h2 className="font-tondo font-bold text-xl text-primary">
            Available packs
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Halloween</strong> — 8 friendly-spooky pages (pumpkin,
              ghost, bat, spider, witch hat, candy, moon, cat)
            </li>
            <li>
              <strong>Christmas</strong> — 10 festive pages (tree, gift, candy
              cane, snowman, bell, star, snowflake, stocking, sleigh, holly)
            </li>
            <li>
              <strong>Valentine&apos;s</strong> — 6 love-themed pages (hearts,
              flowers, ribbons, love letters)
            </li>
            <li>
              <strong>Easter</strong> — 8 spring pages (egg, rabbit, flowers,
              carrot, tree)
            </li>
            <li>
              <strong>Thanksgiving</strong> — 8 autumn/harvest pages (turkey,
              pie, pumpkin, corn, wheat, apple)
            </li>
            <li>
              <strong>Back-to-school</strong> — 10 classroom-essential pages
              (backpack, pencil, crayon, book, apple, ruler, scissors)
            </li>
          </ul>
          <p className="pt-4">
            Nothing is saved on our servers — your child&apos;s name (if you add
            one) stays in your browser.
          </p>
        </section>
      </div>
    </>
  );
};

export default SeasonalPackPage;
