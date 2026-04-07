import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Coloring Habitat",
};

const TermsPage = () => {
  return (
    <>
      <main className="bg-background py-16">
        <div className="prose prose-neutral mx-auto max-w-3xl px-6">
          <h1>Terms of Service</h1>
          <p className="lead">Last updated: March 2026</p>

          <h2>1. Service description</h2>
          <p>
            Coloring Habitat provides AI-generated coloring pages for personal
            use. Pages can be colored online or downloaded as PDFs for printing.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You may use some features without an account. Creating an account
            allows you to save artwork, access your gallery, and manage
            subscriptions.
          </p>

          <h2>3. Subscriptions</h2>
          <p>
            Paid plans (Grove, Sanctuary) are billed monthly or annually via
            Stripe. You can cancel at any time — access continues until the end
            of your billing period. Refunds are handled on a case-by-case basis.
          </p>

          <h2>4. Content ownership</h2>
          <p>
            Coloring pages you generate are yours to use for personal,
            non-commercial purposes. You retain ownership of your colored
            artwork.
          </p>

          <h2>5. Acceptable use</h2>
          <p>
            You agree not to use the service to generate offensive, harmful, or
            illegal content. We reserve the right to terminate accounts that
            violate these terms.
          </p>

          <h2>6. Limitation of liability</h2>
          <p>
            The service is provided &ldquo;as is&rdquo;. We are not liable for
            any damages arising from your use of the service.
          </p>

          <h2>7. Contact</h2>
          <p>
            For questions about these terms, email{" "}
            <a href="mailto:support@coloringhabitat.com">
              support@coloringhabitat.com
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
};

export default TermsPage;
