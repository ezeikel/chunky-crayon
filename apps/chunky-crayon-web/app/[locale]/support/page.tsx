import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import CachedLastUpdateDate from '@/components/CachedLastUpdateDate/CachedLastUpdateDate';

const TITLE = 'Support | Chunky Crayon';
const DESCRIPTION =
  'Get help with Chunky Crayon. Contact us, manage your subscription, fix common problems, or delete your account. Built for kids, designed for parents.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const Support = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Support</h1>
    <p className="text-gray-600 mb-8">
      Last updated: <CachedLastUpdateDate />
    </p>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">1. Contact us</h2>
      <p className="mb-4">
        Chunky Crayon is made by Chewy Bytes Limited. We are a small team and we
        read every message. The fastest way to reach a human is email:
      </p>
      <p className="mb-4">
        <a
          href="mailto:support@chunkycrayon.com?subject=Chunky%20Crayon%20Support"
          className="text-blue-600 underline"
        >
          support@chunkycrayon.com
        </a>
      </p>
      <p className="mb-4">
        We usually reply within one to two business days. When you write, it
        helps to tell us your device (for example iPhone, iPad, or Android),
        what you were trying to do, and what happened instead.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">2. Common questions</h2>

      <h3 className="text-xl font-semibold mb-2">Do we need an account?</h3>
      <p className="mb-4">
        No. Most of Chunky Crayon works without an account, and your child can
        color, save to the device, and print without signing in. Signing in with
        Apple or Google is optional, and it lets you keep artwork across
        devices.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        How do credits and plans work?
      </h3>
      <p className="mb-4">
        Start free with a couple of pages, no account required. When your family
        is ready for more, choose a subscription (Splash, Rainbow, or Sparkle)
        or grab a credit pack and color as you go. You can manage or cancel
        anytime.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        How do I manage or cancel a subscription?
      </h3>
      <p className="mb-4">
        Subscriptions are billed by the App Store or Google Play, so you manage
        them in your Apple or Google account settings. On iPhone or iPad, open
        Settings, tap your name, then Subscriptions. On Android, open the Google
        Play Store, tap your profile, then Payments and subscriptions.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        A page will not load or color in
      </h3>
      <p className="mb-4">
        First, check your internet connection and try again. If a page still
        will not load, close and reopen the app. If the problem continues, email
        us with the page or scene name and we will take a look.
      </p>

      <h3 className="text-xl font-semibold mb-2">
        How do I restore a purchase?
      </h3>
      <p className="mb-4">
        Open the app, open the grown-ups area, and use Restore Purchases. Make
        sure you are signed in to the same Apple or Google account you used to
        buy.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">3. Privacy and your data</h2>
      <p className="mb-4">
        Chunky Crayon is built for families with kids ages 3 to 8. There are no
        ads and no outside tracking. Creation tools that take open-ended input,
        along with purchases and outside links, sit behind a parents-only gate.
      </p>
      <p className="mb-4">
        To delete your account and erase your data, see{' '}
        <a
          href="https://www.chunkycrayon.com/en/delete-account?utm_source=support&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          Delete Your Account
        </a>
        . For the full detail on how we handle information, read our{' '}
        <a
          href="https://www.chunkycrayon.com/en/privacy?utm_source=support&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          Privacy Policy
        </a>{' '}
        and{' '}
        <a
          href="https://www.chunkycrayon.com/en/terms?utm_source=support&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          Terms of Use
        </a>
        .
      </p>
    </section>
  </PageWrap>
);

export default Support;
