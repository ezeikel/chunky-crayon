import {
  PortableText as PortableTextRoot,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import type { ImageUrlBuilder, SanityImageSource } from "../sanity/client";
import type { SanityImage } from "../sanity/queries";

/**
 * Renders Sanity Portable Text with Tailwind-styled components.
 *
 * `urlForImage` is injected (built via `createUrlForImage(client)` in the
 * consuming app) so the package doesn't bake in a site's Sanity client.
 */
type UrlForImage = (source: SanityImageSource) => ImageUrlBuilder;

const buildComponents = (urlForImage: UrlForImage): PortableTextComponents => ({
  block: {
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-bold mt-12 mb-4 tracking-tight text-slate-900">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3 text-slate-900">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-base md:text-lg leading-relaxed mb-5 text-slate-700">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-orange-400 pl-4 italic my-6 text-slate-700">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-5 space-y-2 text-slate-700">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-5 space-y-2 text-slate-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => {
      const href = value?.href ?? "#";
      const isExternal = href.startsWith("http");
      return (
        <a
          href={href}
          className="text-orange-600 underline hover:text-orange-700"
          {...(isExternal
            ? { rel: "noopener noreferrer", target: "_blank" }
            : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }: { value: SanityImage }) => {
      if (!value?.asset) return null;
      const src = urlForImage(value)
        .width(1200)
        .fit("max")
        .auto("format")
        .url();
      return (
        <figure className="my-8">
          <img
            src={src}
            alt={value.alt ?? ""}
            className="rounded-xl w-full"
            loading="lazy"
          />
        </figure>
      );
    },
  },
});

export const PortableText = ({
  value,
  urlForImage,
}: {
  value: unknown[];
  urlForImage: UrlForImage;
}) => (
  <PortableTextRoot
    value={value as PortableTextBlock[]}
    components={buildComponents(urlForImage)}
  />
);
