import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@one-colored-pixel/db";
import { auth } from "@/auth";
import ColoringPageContent from "@/components/ColoringPageContent/ColoringPageContent";
import { ColoringContextProvider } from "@one-colored-pixel/coloring-ui";
import { BRAND } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const image = await db.coloringImage.findUnique({
    where: { id, brand: BRAND },
    select: { title: true, description: true, tags: true },
  });

  if (!image) {
    return { title: "Coloring Page Not Found" };
  }

  const title = `${image.title || "Coloring Page"} | Coloring Habitat`;
  const description =
    image.description ||
    "Free adult coloring page from Coloring Habitat. Color online for relaxation and mindfulness.";

  return {
    title,
    description,
    keywords:
      image.tags?.join(", ") || "coloring page, adult coloring, mindfulness",
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

const ColoringImagePage = async ({ params }: Props) => {
  const { id } = await params;

  const [image, session] = await Promise.all([
    db.coloringImage.findUnique({
      where: { id, brand: BRAND },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        svgUrl: true,
        difficulty: true,
        tags: true,
        fillPointsJson: true,
        colorMapJson: true,
        ambientSoundUrl: true,
      },
    }),
    auth(),
  ]);

  if (!image) {
    notFound();
  }

  const isAuthenticated = !!session?.user?.id;

  return (
    <>
      <main className="bg-background py-8">
        <div className="mx-auto max-w-7xl px-6">
          {/* Back to gallery link */}
          <Link
            href="/gallery"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Gallery
          </Link>

          {/* Coloring canvas with toolbar and sidebars */}
          <ColoringContextProvider>
            <ColoringPageContent
              coloringImage={image}
              isAuthenticated={isAuthenticated}
              title={image.title || "Coloring Page"}
            />
          </ColoringContextProvider>

          {/* Metadata: description and tags */}
          <div className="mt-8 max-w-3xl mx-auto">
            {image.description && (
              <p className="text-muted-foreground">{image.description}</p>
            )}

            {image.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {image.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ColoringImagePage;
