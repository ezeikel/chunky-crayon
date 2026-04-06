import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Coloring Habitat",
};

const PrivacyPage = () => {
  return (
    <>
      <main className="bg-background py-16">
        <div className="prose prose-neutral mx-auto max-w-3xl px-6">
          <h1>Privacy Policy</h1>
          <p className="lead">Last updated: March 2026</p>

          <h2>What we collect</h2>
          <p>
            When you create an account, we collect your email address and name
            (if provided via Google sign-in). We store your coloring creations
            and saved artwork linked to your account.
          </p>

          <h2>How we use your data</h2>
          <ul>
            <li>To provide and improve the Coloring Habitat service</li>
            <li>To send you your daily coloring page (if subscribed)</li>
            <li>To process payments via Stripe</li>
            <li>To send transactional emails (welcome, payment receipts)</li>
          </ul>

          <h2>Analytics</h2>
          <p>
            We use PostHog for product analytics and Sentry for error tracking.
            Both are configured to respect your privacy — no personal data is
            shared with advertisers.
          </p>

          <h2>Data storage</h2>
          <p>
            Your data is stored securely using Neon (PostgreSQL) and Cloudflare
            R2 for image assets. All connections are encrypted.
          </p>

          <h2>Your rights</h2>
          <p>
            You can request deletion of your account and all associated data at
            any time by contacting us at privacy@coloringhabitat.com.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy-related enquiries, email{" "}
            <a href="mailto:privacy@coloringhabitat.com">
              privacy@coloringhabitat.com
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
};

export default PrivacyPage;
