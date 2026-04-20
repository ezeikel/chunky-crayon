import { Metadata } from 'next';
import NameGeneratorForm from './NameGeneratorForm';

export const metadata: Metadata = {
  title: 'Free Personalised Name Coloring Pages for Kids | Chunky Crayon',
  description:
    "Create a free coloring page with your child's name in big bubble letters. Pick a theme (animals, unicorns, dinosaurs, space…), generate, print. No signup.",
  alternates: {
    canonical: 'https://chunkycrayon.com/en/tools/name',
  },
  openGraph: {
    title: 'Free Personalised Name Coloring Pages',
    description:
      "Custom coloring page with your child's name + a fun theme. Free to print.",
    type: 'website',
  },
};

const NameToolPage = () => (
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
      <h2 className="font-tondo font-bold text-xl text-primary">Great for</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>First day of school or nursery</li>
        <li>Birthday party placemats</li>
        <li>Rainy afternoon activity</li>
        <li>Quiet-time on long car journeys</li>
      </ul>
      <p className="pt-4">
        Your child&apos;s name is only sent to the AI to build the image — we
        don&apos;t store it separately.
      </p>
    </section>
  </div>
);

export default NameToolPage;
