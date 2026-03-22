import Image from "next/image";
import Link from "next/link";
import type { PortableTextComponents } from "@portabletext/react";
import { urlFor } from "@/lib/sanity";

export const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) {
        return null;
      }
      return (
        <figure className="my-8">
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <Image
              src={urlFor(value).width(1200).height(675).url()}
              alt={value.alt || "Blog image"}
              fill
              className="object-cover"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
  block: {
    h1: ({ children }) => (
      <h1 className="mb-6 mt-12 text-3xl font-extrabold tracking-tight text-foreground first:mt-0 md:text-4xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 text-xl font-semibold text-foreground md:text-2xl">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-6 text-lg font-semibold text-foreground md:text-xl">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-r-lg border-l-4 border-primary bg-secondary/50 py-2 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-2 pl-6 text-muted-foreground">
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
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm text-primary">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const target = value?.href?.startsWith("http") ? "_blank" : undefined;
      return (
        <Link
          href={value?.href || "#"}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {children}
        </Link>
      );
    },
  },
};

export default portableTextComponents;
