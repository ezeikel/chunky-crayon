import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import CachedLastUpdateDate from '@/components/CachedLastUpdateDate/CachedLastUpdateDate';

const TITLE = 'Delete Your Account | Chunky Crayon';
const DESCRIPTION =
  'How to delete your Chunky Crayon account and erase your data. Built for kids, designed for parents, COPPA and GDPR-K compliant.';

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

const DeleteAccount = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Delete Your Account</h1>
    <p className="text-gray-600 mb-8">
      Last updated: <CachedLastUpdateDate />
    </p>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
      <p className="mb-4">
        Chunky Crayon is operated by Chewy Bytes Limited (&ldquo;we&rdquo;,
        &ldquo;our&rdquo;, or &ldquo;us&rdquo;). You can delete your account and
        erase your personal data at any time. This page explains how to do that
        and what happens when you do.
      </p>
      <p className="mb-4">
        Most of Chunky Crayon works without an account. If your child has been
        using the app without signing in, there is no account to delete. To
        remove the artwork and settings saved on the device, simply uninstall
        the app.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        2. Delete your account in the app
      </h2>
      <p className="mb-4">
        If you signed in with Apple or Google to save artwork across devices,
        you can delete your account from inside the app:
      </p>
      <ol className="list-decimal pl-6 mb-4">
        <li>Open Chunky Crayon.</li>
        <li>Tap the grown-ups door and clear the quick parent check.</li>
        <li>
          Open Settings, then scroll to your account and tap{' '}
          <strong>Delete account</strong>.
        </li>
        <li>
          Clear the parent check again and confirm. Your account and data are
          deleted right away.
        </li>
      </ol>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">3. What we delete</h2>
      <p className="mb-4">
        When you delete your account, we permanently remove:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Your account and any email address or name linked to it</li>
        <li>Your saved artwork and its image files</li>
        <li>Your profiles, characters, stickers, and challenge progress</li>
        <li>Your coloring progress and saved canvases</li>
        <li>Your purchase records and credit balance held in the app</li>
      </ul>
      <p className="mb-4">
        Daily and community coloring pages stay in the shared library, since
        they are meant for everyone and are not personal to you.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">4. Subscriptions</h2>
      <p className="mb-4">
        If you have an active subscription, deleting your Chunky Crayon account
        does not cancel the billing held by the App Store or Google Play. To
        stop future charges, cancel the subscription in your Apple or Google
        account settings before or after you delete your account.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">5. Retention</h2>
      <p className="mb-4">
        Account deletion takes effect immediately. We may keep a small amount of
        information for up to 30 days where the law requires us to, for example
        to meet tax or fraud-prevention obligations, after which it is removed.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">6. Need help</h2>
      <p className="mb-4">
        If you cannot access the app or would like us to handle the deletion for
        you, email us at{' '}
        <a
          href="mailto:support@chunkycrayon.com?subject=Account%20Deletion%20Request"
          className="text-blue-600 underline"
        >
          support@chunkycrayon.com
        </a>{' '}
        and we will delete your account and data for you.
      </p>
      <p className="mb-4">
        For more on how we handle your information, see our{' '}
        <a
          href="https://www.chunkycrayon.com/en/privacy?utm_source=delete-account&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          Privacy Policy
        </a>
        .
      </p>
    </section>
  </PageWrap>
);

export default DeleteAccount;
