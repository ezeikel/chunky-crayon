/**
 * Listing Template Preview — Interactive preview of product listing image
 * templates. These React components mirror the Satori templates in
 * apps/chunky-crayon-worker/src/listings/templates/ so you can iterate
 * on designs in-browser before regenerating the actual images.
 *
 * Access at: /dev/listing-templates
 */

import { Suspense } from 'react';
import { ListingTemplatePreview } from './ListingTemplatePreview';

const ListingTemplatesPage = () => {
  return (
    <div className="min-h-screen bg-bg-cream p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="font-tondo text-3xl font-bold text-text-primary mb-2">
            Listing Template Preview
          </h1>
          <p className="text-text-secondary font-rooney-sans">
            Preview the product listing image templates. These mirror the
            Satori-based templates used to generate the actual images.
          </p>
        </header>

        <Suspense fallback={<div>Loading templates...</div>}>
          <ListingTemplatePreview />
        </Suspense>
      </div>
    </div>
  );
};

export default ListingTemplatesPage;
