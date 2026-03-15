import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import CachedLastUpdateDate from '@/components/CachedLastUpdateDate/CachedLastUpdateDate';

export const metadata: Metadata = {
  title: 'Terms of Service - Chunky Crayon',
  description:
    'Terms of Service for Chunky Crayon - Learn about our terms, conditions, and subscription plans.',
};

const TermsOfService = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
    <p className="text-gray-600 mb-8">
      Last updated: <CachedLastUpdateDate />
    </p>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
      <p className="mb-4">
        By accessing or using Chunky Crayon, operated by Chewy Bytes Limited
        (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), you agree to
        be bound by these Terms of Service and all applicable laws and
        regulations. If you do not agree with any of these terms, you are
        prohibited from using or accessing this site.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">2. Company Information</h2>
      <p className="mb-4">
        Chewy Bytes Limited is a company registered in the United Kingdom.
      </p>
      <p className="mb-4">
        Registered Address:
        <br />
        71-75 Shelton Street
        <br />
        London
        <br />
        WC2H 9JQ
        <br />
        United Kingdom
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">3. Subscription Plans</h2>
      <p className="mb-4">We offer the following subscription plans:</p>

      <h3 className="text-xl font-medium mb-2">3.1 Splash Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £7.99/month</li>
        <li>Annual: £79.99/year (save 17%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>250 credits/month (~50 pages)</li>
            <li>All platform features</li>
            <li>Credits reset monthly</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.2 Rainbow Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £13.99/month</li>
        <li>Annual: £139.99/year (save 17%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>500 credits/month (~100 pages)</li>
            <li>All platform features</li>
            <li>Unused credits roll over (up to 1 month)</li>
            <li>Priority support</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.3 Sparkle Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £24.99/month</li>
        <li>Annual: £249.99/year (save 17%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>1,000 credits/month (~200 pages)</li>
            <li>All platform features</li>
            <li>Extended rollover (up to 2 months)</li>
            <li>Commercial use license (see Section 3.4)</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.4 Commercial Use License</h3>
      <p className="mb-4">
        The Sparkle Plan includes a commercial use license, which permits you
        to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>
          Use generated coloring pages for commercial purposes, including but
          not limited to:
          <ul className="list-disc pl-6 mt-2">
            <li>Selling printed coloring books or pages</li>
            <li>
              Using in products for sale (merchandise, educational materials)
            </li>
            <li>
              Using in marketing and promotional materials for your business
            </li>
            <li>Distributing in paid digital products</li>
          </ul>
        </li>
        <li>Create derivative works based on the generated content</li>
        <li>Sublicense the content as part of your own products</li>
      </ul>
      <p className="mb-4">
        <strong>Commercial use restrictions:</strong>
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>
          You may not resell, redistribute, or sublicense the AI model or
          service itself
        </li>
        <li>
          You may not claim the generated content was created without AI
          assistance
        </li>
        <li>
          The commercial license is tied to your active Sparkle Plan
          subscription
        </li>
        <li>
          Content generated during your subscription period remains licensed for
          commercial use even after cancellation
        </li>
      </ul>
      <p className="mb-4">
        <strong>Note:</strong> Splash and Rainbow plan subscribers may only use
        generated content for personal, non-commercial purposes.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
      <p className="mb-4">
        All payments are processed securely through Stripe. By subscribing to
        any of our plans, you agree to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Pay the subscription fee in advance for the billing period</li>
        <li>Provide accurate and complete billing information</li>
        <li>
          Authorize us to charge your payment method for the subscription fee
        </li>
        <li>Understand that subscription fees are non-refundable</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
      <p className="mb-4">
        By using our service, you retain all rights to your content. However,
        you grant us a license to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Store and process your content to provide the service</li>
        <li>Use your content for service improvement and development</li>
        <li>Display your content as part of the service</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
      <p className="mb-4">You agree not to:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Use the service for any illegal purpose</li>
        <li>Violate any laws in your jurisdiction</li>
        <li>Infringe upon the rights of others</li>
        <li>
          Attempt to gain unauthorized access to any portion of the service
        </li>
        <li>Interfere with or disrupt the service or servers</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
      <p className="mb-4">
        We may terminate or suspend your access to the service immediately,
        without prior notice or liability, for any reason whatsoever, including
        without limitation if you breach the Terms.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        8. Limitation of Liability
      </h2>
      <p className="mb-4">
        In no event shall Chewy Bytes Limited, nor its directors, employees,
        partners, agents, suppliers, or affiliates, be liable for any indirect,
        incidental, special, consequential or punitive damages, including
        without limitation, loss of profits, data, use, goodwill, or other
        intangible losses.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
      <p className="mb-4">
        We reserve the right to modify or replace these Terms at any time. If a
        revision is material, we will provide at least 30 days notice prior to
        any new terms taking effect.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about these Terms, please contact us at:
      </p>
      <p className="mb-4">
        Email:{' '}
        <a
          href="mailto:support@chunkycrayon.com"
          className="text-blue-600 underline"
        >
          support@chunkycrayon.com
        </a>
        <br />
        Website:{' '}
        <a
          href="https://www.chunkycrayon.com?utm_source=terms-of-service&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          https://www.chunkycrayon.com
        </a>
      </p>
    </section>
  </PageWrap>
);

export default TermsOfService;
