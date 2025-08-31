import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Terms of Service - Chunky Crayon',
  description:
    'Terms of Service for Chunky Crayon - Learn about our terms, conditions, and subscription plans.',
};

const TermsOfService = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
    <p className="text-gray-600 mb-8">
      Last updated: {new Date().toLocaleDateString()}
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

      <h3 className="text-xl font-medium mb-2">3.1 Crayon Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £19.99/month</li>
        <li>Annual: £79.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>Create coloring pages from text prompts</li>
            <li>Create coloring pages with words, names, and numbers</li>
            <li>Adjust color, contrast, and brightness</li>
            <li>Turn photos into coloring pages</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.2 Rainbow Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £29.99/month</li>
        <li>Annual: £139.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>All Crayon Plan features</li>
            <li>Advanced editing features</li>
            <li>Early access to new models and features</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.3 Masterpiece Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £49.99/month</li>
        <li>Annual: £249.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>All Rainbow Plan features</li>
            <li>Bulk generation</li>
            <li>Commercial use</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.4 Studio Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £59.99/month</li>
        <li>Annual: £599.00/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>All Masterpiece Plan features</li>
            <li>Rollover up to 3 months of credits</li>
          </ul>
        </li>
      </ul>
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
