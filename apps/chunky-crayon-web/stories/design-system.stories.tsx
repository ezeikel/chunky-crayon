import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '@/components/Loading/Loading';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faCircleCheck,
  faPalette,
  faSparkles,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';

const meta = {
  title: 'Chunky Crayon/00 Design System',
  parameters: {
    docs: {
      description: {
        component:
          'Foundational Chunky Crayon tokens and primitives used by the app: palette, typography, buttons, forms, cards, loaders, and toast feedback.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const swatches = [
  {
    family: 'Orange',
    use: 'Primary actions, brand warmth, conversion moments',
    colors: [
      ['Light', 'bg-crayon-orange-light', '12 80% 75%'],
      ['Base', 'bg-crayon-orange', '12 75% 58%'],
      ['Dark', 'bg-crayon-orange-dark', '12 70% 48%'],
    ],
  },
  {
    family: 'Teal',
    use: 'Secondary actions, friendly accents, icon pairs',
    colors: [
      ['Light', 'bg-crayon-teal-light', '25 85% 85%'],
      ['Base', 'bg-crayon-teal', '25 80% 72%'],
      ['Dark', 'bg-crayon-teal-dark', '25 75% 58%'],
    ],
  },
  {
    family: 'Pink',
    use: 'Delight, error feedback, celebratory surfaces',
    colors: [
      ['Light', 'bg-crayon-pink-light', '355 70% 86%'],
      ['Base', 'bg-crayon-pink', '355 65% 72%'],
      ['Dark', 'bg-crayon-pink-dark', '355 60% 58%'],
    ],
  },
  {
    family: 'Yellow',
    use: 'Rewards, highlights, progress moments',
    colors: [
      ['Light', 'bg-crayon-yellow-light', '42 100% 80%'],
      ['Base', 'bg-crayon-yellow', '42 95% 62%'],
      ['Dark', 'bg-crayon-yellow-dark', '42 90% 48%'],
    ],
  },
  {
    family: 'Green',
    use: 'Success, confirmation, safe progress',
    colors: [
      ['Light', 'bg-crayon-green-light', '85 40% 72%'],
      ['Base', 'bg-crayon-green', '85 35% 52%'],
      ['Dark', 'bg-crayon-green-dark', '85 35% 40%'],
    ],
  },
  {
    family: 'Blue',
    use: 'Information, gallery filters, calm contrast',
    colors: [
      ['Light', 'bg-crayon-blue-light', '210 75% 78%'],
      ['Base', 'bg-crayon-blue', '210 70% 62%'],
      ['Dark', 'bg-crayon-blue-dark', '210 65% 50%'],
    ],
  },
  {
    family: 'Purple',
    use: 'Magic, premium moments, loading states',
    colors: [
      ['Light', 'bg-crayon-purple-light', '340 35% 80%'],
      ['Base', 'bg-crayon-purple', '340 30% 65%'],
      ['Dark', 'bg-crayon-purple-dark', '340 30% 50%'],
    ],
  },
  {
    family: 'Paper',
    use: 'App backgrounds, cards, dividers, quiet surfaces',
    colors: [
      ['Sky', 'bg-paper-sky', '35 45% 94%'],
      ['Cream', 'bg-paper-cream', '40 50% 96%'],
      ['Cream dark', 'bg-paper-cream-dark', '35 40% 93%'],
    ],
  },
];

export const Foundations: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section>
          <h1 className="font-tondo text-5xl font-bold text-gradient-orange">
            Chunky Crayon
          </h1>
          <p className="mt-3 max-w-2xl font-rooney-sans text-lg text-text-secondary">
            The Chunky Crayon system is built from warm paper surfaces, chunky
            Tondo headings, Rooney Sans body copy, bright crayon accents, and
            tactile controls that feel safe for kids and clear for parents.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            <p className="font-tondo text-xl font-bold text-text-primary">
              Brand voice
            </p>
            <p className="mt-2 text-text-secondary">
              Playful, direct, and parent-readable. Avoid tiny helper copy for
              kid-facing actions.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            <p className="font-tondo text-xl font-bold text-text-primary">
              Shape language
            </p>
            <p className="mt-2 text-text-secondary">
              Pill CTAs, rounded cards, thick borders, and soft shadows. Icons
              should do more work than text on compact tools.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            <p className="font-tondo text-xl font-bold text-text-primary">
              Interaction feel
            </p>
            <p className="mt-2 text-text-secondary">
              Bouncy but not chaotic: scale on hover, confident focus rings, and
              clear pressed states for touch screens.
            </p>
          </div>
        </section>
      </div>
    </main>
  ),
};

export const Colors: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header>
          <h1 className="font-tondo text-4xl font-bold text-text-primary">
            Color Palette
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            These are the active Chunky Crayon tokens from `global.css`. The
            base colors carry most UI work; light and dark steps support hover,
            borders, shadows, and soft backgrounds.
          </p>
        </header>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {swatches.map((group) => (
            <article
              key={group.family}
              className="rounded-3xl border-2 border-paper-cream-dark bg-white p-4 shadow-card"
            >
              <div className="overflow-hidden rounded-2xl border-2 border-paper-cream-dark">
                {group.colors.map(([label, className]) => (
                  <div
                    key={label}
                    className={`flex h-20 items-end justify-between p-3 ${className}`}
                  >
                    <span className="rounded-full bg-white/90 px-3 py-1 font-tondo text-sm font-bold text-text-primary shadow-sm">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <h2 className="mt-4 font-tondo text-xl font-bold text-text-primary">
                {group.family}
              </h2>
              <p className="mt-1 min-h-12 text-sm text-text-secondary">
                {group.use}
              </p>
              <div className="mt-4 space-y-1 rounded-2xl bg-paper-cream p-3 font-mono text-xs text-text-secondary">
                {group.colors.map(([label, , value]) => (
                  <p key={label}>{value}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  ),
};

export const Typography: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header>
          <h1 className="font-tondo text-4xl font-bold text-text-primary">
            Typography
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            Storybook loads the same local font files as the app. Tondo is the
            display and UI-heading face; Rooney Sans is the body and readable
            interface face.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            <p className="font-tondo text-sm font-bold text-crayon-orange">
              Heading font
            </p>
            <h2 className="mt-3 font-tondo text-5xl font-bold text-text-primary">
              Tondo
            </h2>
            <div className="mt-5 space-y-3 font-tondo text-text-primary">
              <p className="text-4xl font-bold">Make a dragon tea party</p>
              <p className="text-3xl font-bold">Create coloring pages</p>
              <p className="text-2xl font-bold">Choose a category</p>
              <p className="text-xl font-bold">Download your pack</p>
              <p className="text-base font-bold">Button and label text</p>
            </div>
          </article>

          <article className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
            <p className="font-tondo text-sm font-bold text-crayon-orange">
              Body font
            </p>
            <h2 className="mt-3 font-rooney-sans text-5xl font-bold text-text-primary">
              Rooney Sans
            </h2>
            <div className="mt-5 space-y-3 font-rooney-sans text-text-secondary">
              <p className="text-xl font-bold text-text-primary">
                Parent-readable product copy
              </p>
              <p className="text-lg">
                Turn any wild idea into a printable coloring page in seconds.
              </p>
              <p className="text-base">
                Body copy should stay warm and clear, with enough line height
                for scanning.
              </p>
              <p className="text-sm">
                Helper copy, captions, metadata, form hints, and secondary
                explanations.
              </p>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 shadow-card">
          <h2 className="font-tondo text-2xl font-bold text-text-primary">
            Weight Ramp
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[300, 400, 500, 700, 800, 900].map((weight) => (
              <div
                key={weight}
                className="rounded-2xl bg-paper-cream px-4 py-3"
              >
                <p
                  className="font-rooney-sans text-xl text-text-primary"
                  style={{ fontWeight: weight }}
                >
                  Rooney Sans {weight}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  ),
};

export const SectionHeaders: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <h1 className="font-tondo text-4xl font-bold text-text-primary">
            Section Header Patterns
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            These are the repeated heading treatments currently used across
            homepage, gallery, pricing, and content sections. This makes font
            weight drift visible.
          </p>
        </header>

        <section className="rounded-3xl border-2 border-paper-cream-dark bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-crayon-orange/10">
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-2xl text-crayon-orange"
            />
          </div>
          <h2 className="font-tondo text-4xl font-bold text-text-primary md:text-5xl">
            Make any idea colorable
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
            Main marketing sections use centered Tondo, strong weight, and a
            short Rooney Sans support line.
          </p>
        </section>

        <section className="rounded-3xl border-2 border-paper-cream-dark bg-white p-8 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-crayon-yellow/20 px-4 py-2 font-tondo text-sm font-bold text-text-primary">
                <FontAwesomeIcon icon={faBookOpen} />
                Free library
              </div>
              <h2 className="font-tondo text-3xl font-bold text-text-primary md:text-4xl">
                New coloring pages today
              </h2>
              <p className="mt-3 max-w-2xl text-text-secondary">
                Gallery and listing headers work better left-aligned, with the
                action or filter row beside them on desktop.
              </p>
            </div>
            <Button variant="secondary">See all</Button>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {[
            ['Card header', 'Small repeated cards use Tondo 20/24 bold.'],
            ['Modal title', 'Dialog titles use Tondo 24/32 bold, centered.'],
            ['Tool label', 'Compact labels use Tondo 14/20 bold.'],
          ].map(([title, body]) => (
            <article
              key={title}
              className="rounded-3xl border-2 border-paper-cream-dark bg-white p-5 shadow-card"
            >
              <h3 className="font-tondo text-xl font-bold text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  ),
};

export const ModalPatterns: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <h1 className="font-tondo text-4xl font-bold text-text-primary">
            Modal Patterns
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            Modals should share the same card shell, centered title treatment,
            icon badge, and chunky actions. The content can change; the frame
            should not.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Confirm',
              body: 'Use for destructive or irreversible kid-facing actions.',
              icon: faCircleCheck,
              color: 'bg-crayon-green text-white',
              action: 'Yes, do it',
            },
            {
              title: 'Parent gate',
              body: 'Use when a grown-up needs to unlock a setting or link.',
              icon: faSparkles,
              color: 'bg-crayon-orange text-white',
              action: 'Unlock',
            },
            {
              title: 'Feedback',
              body: 'Use for support, bug reports, and quick parent messages.',
              icon: faPalette,
              color: 'bg-crayon-purple text-white',
              action: 'Send',
            },
          ].map((modal) => (
            <article
              key={modal.title}
              className="rounded-3xl border-2 border-paper-cream-dark bg-white p-6 text-center shadow-card"
            >
              <div
                className={`mx-auto flex size-16 items-center justify-center rounded-full shadow-btn-primary ${modal.color}`}
              >
                <FontAwesomeIcon icon={modal.icon} className="text-2xl" />
              </div>
              <h2 className="mt-5 font-tondo text-2xl font-bold text-text-primary">
                {modal.title}
              </h2>
              <p className="mt-2 min-h-12 text-text-secondary">{modal.body}</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="outline">Cancel</Button>
                <Button>{modal.action}</Button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  ),
};

export const Buttons: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <h1 className="font-tondo text-4xl font-bold text-text-primary">
            Buttons
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-text-secondary">
            The app should use one shared Button API with clear roles. Primary
            CTAs should use the tactile deep style; quiet controls and links
            should stay visually lighter. The old glow CTA treatment has been
            removed so primary actions share the same tactile language.
          </p>
        </header>
        <section className="rounded-3xl border-2 border-paper-cream-dark bg-white p-5 shadow-card">
          <h2 className="font-tondo text-2xl font-bold text-text-primary">
            Recommendation
          </h2>
          <p className="mt-2 max-w-3xl text-text-secondary">
            Standardise primary actions on the deep/tactile CTA. It matches the
            toast language, feels more like Chunky Crayon, and has a clearer
            press state than the glow-only treatment.
          </p>
        </section>
        <section className="flex flex-col gap-4 border-t-2 border-paper-cream-dark pt-6">
          <div>
            <h2 className="font-tondo text-2xl font-bold text-text-primary">
              1. Primary CTA
            </h2>
            <p className="mt-1 max-w-3xl text-text-secondary">
              Use for the main action in a section or form: create, sign in,
              save, continue, buy, download.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Button>Default create</Button>
            <Button size="sm">Small size</Button>
            <Button size="lg">Large size</Button>
            <Button className="h-auto rounded-full px-10 py-4 text-base md:text-lg">
              Create
            </Button>
            <Button
              disabled
              className="h-auto rounded-full py-4 text-base md:text-lg"
            >
              Create disabled
            </Button>
          </div>
        </section>
        <section className="flex flex-col gap-4 border-t-2 border-paper-cream-dark pt-6">
          <div>
            <h2 className="font-tondo text-2xl font-bold text-text-primary">
              2. Quiet And Support Controls
            </h2>
            <p className="mt-1 max-w-3xl text-text-secondary">
              Use when the action is secondary, reversible, or one of several
              choices in a dense form.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Button variant="outline-muted">Quiet outline</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="neutral">Neutral</Button>
          </div>
        </section>
        <section className="flex flex-col gap-4 border-t-2 border-paper-cream-dark pt-6">
          <div>
            <h2 className="font-tondo text-2xl font-bold text-text-primary">
              3. Text Link
            </h2>
            <p className="mt-1 max-w-3xl text-text-secondary">
              Use for low-emphasis navigation or helper actions. This is not a
              CTA shape.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Button variant="link">Link button</Button>
          </div>
        </section>
        <section className="flex flex-col gap-4 border-t-2 border-paper-cream-dark pt-6">
          <div>
            <h2 className="font-tondo text-2xl font-bold text-text-primary">
              4. Status Actions
            </h2>
            <p className="mt-1 max-w-3xl text-text-secondary">
              Use only when the button meaning is semantic: success,
              destructive, warning, or a similar state.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Button variant="success">Success</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="secondary">Secondary highlight</Button>
          </div>
        </section>
      </div>
    </main>
  ),
};

export const FormsAndCards: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-2 border-paper-cream-dark bg-white shadow-card">
          <CardHeader>
            <CardTitle className="font-tondo">Support request</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input placeholder="Parent email" />
            <Textarea placeholder="What happened?" />
            <div className="flex flex-wrap gap-2">
              <Badge>New</Badge>
              <Badge variant="secondary">Billing</Badge>
              <Badge variant="outline">Low urgency</Badge>
            </div>
            <Button>Send</Button>
          </CardContent>
        </Card>
        <Card className="border-2 border-paper-cream-dark bg-white shadow-card">
          <CardHeader>
            <CardTitle className="font-tondo">Loading states</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-8">
            <Loading size="sm" />
            <Loading />
            <Loading size="lg" />
          </CardContent>
        </Card>
      </div>
    </main>
  ),
};

export const ToastFeedback: Story = {
  render: () => (
    <main className="p-8">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-4">
        <Button onClick={() => toast.success('Coloring page saved')}>
          Success toast
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast.error('Could not create that page')}
        >
          Error toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast('Drawing your page now')}
        >
          Neutral toast
        </Button>
      </div>
      <Toaster />
    </main>
  ),
};
