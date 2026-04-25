import { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';
import { buildToolSchema } from '@/lib/seo/tool-schema';
import BirthdayInviteForm from './BirthdayInviteForm';

type PageParams = { locale: string };

const TOOL_NAME = 'Birthday Invite Maker';
const TOOL_DESCRIPTION =
  "Make a free printable kids' birthday invite in 30 seconds. Pick a theme, add party details, download the PDF. Choose 1-up or 4-up layout.";
const TOOL_PATH = '/tools/birthday-invite';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Free Printable Birthday Invite Maker for Kids | Chunky Crayon',
    description: TOOL_DESCRIPTION,
    alternates: generateAlternates(locale, TOOL_PATH),
    openGraph: {
      title: 'Free Printable Birthday Invite Maker',
      description:
        'Pick a theme, type the party details, print. No signup, nothing saved on our servers.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${TOOL_PATH}`,
    },
  };
}

const BirthdayInvitePage = async ({
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
            Free Birthday Invite Maker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Add your child&apos;s name, age, and party details. Pick a theme.
            Download a ready-to-print PDF — 1 big invite per page, or 4 small
            ones to cut out.
          </p>
        </header>

        <BirthdayInviteForm />

        <section className="mt-16 space-y-4 text-sm text-muted-foreground max-w-2xl mx-auto">
          <h2 className="font-tondo font-bold text-xl text-primary">
            How to use
          </h2>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Fill in your party details. Pick a theme.</li>
            <li>
              Choose 1-up (one big invite) or 4-up (four per letter page).
            </li>
            <li>Download. Print on card stock if you can.</li>
            <li>Let your kid colour in the shapes before handing them out.</li>
          </ol>
          <p className="pt-4">
            Nothing you type is stored on our servers — your party details stay
            in your browser.
          </p>
        </section>
      </div>
    </>
  );
};

export default BirthdayInvitePage;
