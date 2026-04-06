import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { getSharedArtworkByCode } from "@/app/actions/share";

type SharedArtworkPageProps = {
  params: Promise<{ code: string }>;
};

export const generateStaticParams = () => [{ code: "placeholder" }];

export async function generateMetadata({
  params,
}: SharedArtworkPageProps): Promise<Metadata> {
  await connection();
  const { code } = await params;
  const artwork = await getSharedArtworkByCode(code);

  if (!artwork) {
    return {
      title: "Artwork Not Found | Coloring Habitat",
    };
  }

  return {
    title: `${artwork.title} | Coloring Habitat`,
    description: `Check out this beautiful coloring artwork on Coloring Habitat!`,
    openGraph: {
      title: `${artwork.title} | Coloring Habitat`,
      description: `Check out this beautiful coloring artwork on Coloring Habitat!`,
      images: [artwork.imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artwork.title} | Coloring Habitat`,
      description: `Check out this beautiful coloring artwork on Coloring Habitat!`,
      images: [artwork.imageUrl],
    },
  };
}

const SharedArtworkLoading = () => (
  <div className="mx-auto max-w-2xl px-6 py-12">
    <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
      Shared Artwork
    </h1>
    <div className="flex items-center justify-center py-20">
      <FontAwesomeIcon
        icon={faSpinner}
        className="text-4xl text-primary animate-spin"
      />
    </div>
  </div>
);

const SharedArtworkContent = async ({ code }: { code: string }) => {
  await connection();
  const artwork = await getSharedArtworkByCode(code);

  if (!artwork) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Main Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Artwork Image */}
        <div className="relative aspect-square bg-muted p-4">
          <Image
            src={artwork.imageUrl}
            alt={artwork.title}
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Artwork Info */}
        <div className="p-6 border-t border-border">
          {/* Title */}
          <h1 className="text-xl md:text-2xl font-bold text-foreground text-center mb-3">
            {artwork.title}
          </h1>

          {/* Date */}
          <p className="text-center text-sm text-muted-foreground mb-4">
            Created {format(new Date(artwork.createdAt), "MMMM d, yyyy")}
          </p>

          {/* Tags */}
          {artwork.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {artwork.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="mt-8 bg-primary rounded-xl p-6 text-center">
        <h2 className="text-lg font-bold text-primary-foreground mb-2">
          Want to create your own artwork?
        </h2>
        <p className="text-primary-foreground/80 text-sm mb-4">
          Join Coloring Habitat and discover the joy of mindful coloring.
        </p>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground font-semibold rounded-lg hover:bg-background/90 transition-colors"
        >
          Start Coloring
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </Link>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        Coloring Habitat - Mindful coloring for adults
      </p>
    </div>
  );
};

const SharedArtworkPage = async ({ params }: SharedArtworkPageProps) => {
  const { code } = await params;

  return (
    <>
      <main className="min-h-screen">
        <Suspense fallback={<SharedArtworkLoading />}>
          <SharedArtworkContent code={code} />
        </Suspense>
      </main>
    </>
  );
};

export default SharedArtworkPage;
