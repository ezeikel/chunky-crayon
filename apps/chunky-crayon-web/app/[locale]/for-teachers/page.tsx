import { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { generateAlternates } from '@/lib/seo';
import { faStar } from '@fortawesome/pro-duotone-svg-icons/faStar';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons/faPalette';
import { faCakeCandles } from '@fortawesome/pro-duotone-svg-icons/faCakeCandles';
import { faBookOpen } from '@fortawesome/pro-duotone-svg-icons/faBookOpen';
import { faCalendarStar } from '@fortawesome/pro-duotone-svg-icons/faCalendarStar';
import { faCheck } from '@fortawesome/pro-duotone-svg-icons/faCheck';

const DUOTONE_STYLE = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-teal))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

type PageParams = { locale: string };

const HUB_PATH = '/for-teachers';
const HUB_DESCRIPTION =
  'Free classroom printables for preschool and early primary teachers. Behavior charts, coloring pages, worksheets. No signup, no student data stored.';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      'Free Coloring Pages & Printables for Teachers (Preschool, K–2) | Chunky Crayon',
    description: HUB_DESCRIPTION,
    alternates: generateAlternates(locale, HUB_PATH),
    openGraph: {
      title: 'Free Coloring Pages & Printables for Teachers',
      description:
        'No-signup, kid-safe printables for ages 3–8 classrooms. Reward charts, coloring pages, worksheets.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${HUB_PATH}`,
    },
  };
}

const TeacherHubPage = () => (
  <div className="max-w-5xl mx-auto py-12 px-4">
    <header className="text-center mb-12">
      <h1 className="font-tondo text-4xl md:text-5xl font-extrabold mb-4 text-primary">
        Free printables for your classroom.
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        No signup. No ads to sidestep. No student data collected. Everything
        here was built by a parent for preschool and early-primary teachers.
      </p>
    </header>

    {/* Tool cards */}
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
      <Link
        href="/tools/reward-chart"
        className="block p-6 bg-white rounded-2xl border-2 border-paper-cream-dark hover:border-crayon-orange transition"
      >
        <div className="flex items-start gap-4">
          <FontAwesomeIcon
            icon={faStar}
            className="text-3xl mt-1"
            style={DUOTONE_STYLE}
          />
          <div>
            <h2 className="font-tondo text-2xl font-bold text-primary mb-1">
              Classroom Job & Reward Chart
            </h2>
            <p className="text-muted-foreground">
              Weekly chart with your students&apos; names (or class jobs) and up
              to 7 tracked behaviors. Five themes, 5- or 7-day layouts.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/gallery"
        className="block p-6 bg-white rounded-2xl border-2 border-paper-cream-dark hover:border-crayon-orange transition"
      >
        <div className="flex items-start gap-4">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-3xl mt-1"
            style={DUOTONE_STYLE}
          />
          <div>
            <h2 className="font-tondo text-2xl font-bold text-primary mb-1">
              Coloring Page Gallery
            </h2>
            <p className="text-muted-foreground">
              Hundreds of free AI-generated coloring pages for ages 3–8. Filter
              by theme or difficulty. Print-ready PDFs.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/tools/birthday-invite"
        className="block p-6 bg-white rounded-2xl border-2 border-paper-cream-dark hover:border-crayon-orange transition"
      >
        <div className="flex items-start gap-4">
          <FontAwesomeIcon
            icon={faCakeCandles}
            className="text-3xl mt-1"
            style={DUOTONE_STYLE}
          />
          <div>
            <h2 className="font-tondo text-2xl font-bold text-primary mb-1">
              Birthday Invite Maker
            </h2>
            <p className="text-muted-foreground">
              Themed printable invites for class birthdays or end-of-term
              parties. 1-up for big pinboards, 4-up for handouts.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/tools/abc-tracing"
        className="block p-6 bg-white rounded-2xl border-2 border-paper-cream-dark hover:border-crayon-orange transition"
      >
        <div className="flex items-start gap-4">
          <FontAwesomeIcon
            icon={faBookOpen}
            className="text-3xl mt-1"
            style={DUOTONE_STYLE}
          />
          <div>
            <h2 className="font-tondo text-2xl font-bold text-primary mb-1">
              ABC Tracing Worksheets
            </h2>
            <p className="text-muted-foreground">
              27-page A–Z tracing bundle. Word + picture + handwriting row per
              letter. Uppercase, lowercase, or both.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/tools/seasonal-pack"
        className="block p-6 bg-white rounded-2xl border-2 border-paper-cream-dark hover:border-crayon-orange transition"
      >
        <div className="flex items-start gap-4">
          <FontAwesomeIcon
            icon={faCalendarStar}
            className="text-3xl mt-1"
            style={DUOTONE_STYLE}
          />
          <div>
            <h2 className="font-tondo text-2xl font-bold text-primary mb-1">
              Seasonal Coloring Packs
            </h2>
            <p className="text-muted-foreground">
              Halloween, Christmas, Valentine&apos;s, Easter, Thanksgiving and
              Back-to-school — 6–10 themed pages per pack.
            </p>
          </div>
        </div>
      </Link>
    </section>

    {/* What we promise */}
    <section className="bg-paper-cream rounded-2xl p-8 md:p-12 mb-16">
      <h2 className="font-tondo text-2xl md:text-3xl font-bold text-primary mb-6">
        What we promise
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
        <li className="flex gap-3">
          <FontAwesomeIcon
            icon={faCheck}
            className="mt-1 shrink-0"
            style={DUOTONE_STYLE}
          />
          No student data stored. Ever. Typed names stay in the browser.
        </li>
        <li className="flex gap-3">
          <FontAwesomeIcon
            icon={faCheck}
            className="mt-1 shrink-0"
            style={DUOTONE_STYLE}
          />
          No signup required to download any printable.
        </li>
        <li className="flex gap-3">
          <FontAwesomeIcon
            icon={faCheck}
            className="mt-1 shrink-0"
            style={DUOTONE_STYLE}
          />
          No ads, no tracking pixels beyond analytics.
        </li>
        <li className="flex gap-3">
          <FontAwesomeIcon
            icon={faCheck}
            className="mt-1 shrink-0"
            style={DUOTONE_STYLE}
          />
          Print-ready PDFs; works on any classroom printer.
        </li>
      </ul>
    </section>

    {/* Request a printable */}
    <section className="text-center">
      <h2 className="font-tondo text-2xl font-bold text-primary mb-3">
        Need something we don&apos;t have yet?
      </h2>
      <p className="text-muted-foreground mb-4">
        We build the printables teachers actually use. Tell us what would help
        your classroom.
      </p>
      <a
        href="mailto:hello@chunkycrayon.com?subject=Teacher%20printable%20request"
        className="inline-block bg-btn-orange text-white font-tondo font-bold px-6 py-3 rounded-coloring-card shadow-btn-primary hover:scale-105 transition"
      >
        Email us your idea
      </a>
    </section>
  </div>
);

export default TeacherHubPage;
