import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Printable Tools for Parents & Teachers | Chunky Crayon',
  description:
    'Free printable tools for ages 3–8: personalized reward charts, coloring pages, birthday invites, ABC worksheets and more. No signup required.',
  alternates: {
    canonical: 'https://chunkycrayon.com/en/tools',
  },
};

type Tool = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  available: boolean;
};

const TOOLS: Tool[] = [
  {
    slug: 'reward-chart',
    title: 'Reward Chart Maker',
    description:
      'Printable behavior / potty / bedtime chart. Pick a theme, add behaviors, download.',
    emoji: '⭐',
    available: true,
  },
  {
    slug: 'name',
    title: 'Name Coloring Pages',
    description:
      "Personalised coloring page with your child's name in bubble letters.",
    emoji: '🖍️',
    available: true,
  },
  {
    slug: 'birthday-invite',
    title: 'Birthday Invite Maker',
    description:
      'Themed printable invites your kid can help color in. Add party details, print 1-up or 4-up.',
    emoji: '🎂',
    available: true,
  },
  {
    slug: 'abc-tracing',
    title: 'ABC Tracing Worksheets',
    description:
      'A–Z alphabet tracing pages with themed pictures. 27-page PDF bundle, great for preschool and kindergarten.',
    emoji: '🔤',
    available: true,
  },
];

const ToolsHubPage = () => (
  <div className="max-w-5xl mx-auto py-12 px-4">
    <header className="text-center mb-12">
      <h1 className="font-tondo text-4xl font-extrabold mb-3 text-primary">
        Free Printable Tools
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Quick, no-signup printables for parents, grandparents, and teachers of
        young kids (ages 3–8). All COPPA-safe — nothing you type is saved on our
        servers.
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
              <span className="text-4xl">{tool.emoji}</span>
              {!tool.available && (
                <span className="text-xs font-tondo font-bold text-crayon-orange bg-crayon-orange/10 px-2 py-1 rounded-full">
                  Coming soon
                </span>
              )}
            </div>
            <h2 className="font-tondo text-2xl font-bold text-primary">
              {tool.title}
            </h2>
            <p className="text-muted-foreground flex-1">{tool.description}</p>
          </div>
        );
        return tool.available ? (
          <Link key={tool.slug} href={`/tools/${tool.slug}`} className="block">
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
);

export default ToolsHubPage;
