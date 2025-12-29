'use client';

export default function ManualTestingSection() {
  const handlePreview = (inputId: string, pathTemplate: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input?.value) {
      window.open(pathTemplate.replace('{value}', input.value), '_blank');
    }
  };

  return (
    <div className="mt-12 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="font-tondo font-bold text-xl text-text-primary mb-4">
        Manual Testing
      </h2>
      <p className="text-text-secondary mb-4">
        Enter custom paths to test specific OG images:
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="coloring-id"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Coloring Image ID
          </label>
          <div className="flex gap-2">
            <input
              id="coloring-id"
              type="text"
              placeholder="e.g., cm3abc123..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crayon-orange"
            />
            <button
              type="button"
              className="px-4 py-2 bg-crayon-orange text-white rounded-lg font-medium hover:bg-crayon-orange-dark transition-colors"
              onClick={() =>
                handlePreview(
                  'coloring-id',
                  '/en/coloring-image/{value}/opengraph-image',
                )
              }
            >
              Preview
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="blog-slug"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Blog Post Slug
          </label>
          <div className="flex gap-2">
            <input
              id="blog-slug"
              type="text"
              placeholder="e.g., my-blog-post"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crayon-orange"
            />
            <button
              type="button"
              className="px-4 py-2 bg-crayon-orange text-white rounded-lg font-medium hover:bg-crayon-orange-dark transition-colors"
              onClick={() =>
                handlePreview('blog-slug', '/en/blog/{value}/opengraph-image')
              }
            >
              Preview
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="share-code"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Share Code
          </label>
          <div className="flex gap-2">
            <input
              id="share-code"
              type="text"
              placeholder="e.g., abc123"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-crayon-orange"
            />
            <button
              type="button"
              className="px-4 py-2 bg-crayon-orange text-white rounded-lg font-medium hover:bg-crayon-orange-dark transition-colors"
              onClick={() =>
                handlePreview(
                  'share-code',
                  '/en/shared/{value}/opengraph-image',
                )
              }
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
