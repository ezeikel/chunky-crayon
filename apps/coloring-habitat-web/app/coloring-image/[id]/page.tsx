import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@one-colored-pixel/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

const ColoringImagePage = async ({ params }: Props) => {
  await connection();
  const { id } = await params;

  const image = await db.coloringImage.findUnique({
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
    },
  });

  if (!image) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="bg-background py-8">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-2xl font-extrabold text-foreground">
            {image.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{image.description}</p>

          {/* TODO: Integrate ColoringArea component with canvas */}
          <div className="mt-8 flex items-center justify-center rounded-2xl border border-border bg-white p-8">
            {image.svgUrl ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Canvas coloring experience coming soon
                </p>
                <a
                  href={image.svgUrl}
                  download
                  className="mt-4 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-shadow hover:shadow-md"
                >
                  Download SVG
                </a>
              </div>
            ) : image.url ? (
              <img
                src={image.url}
                alt={image.title}
                className="max-h-[600px] rounded-lg"
              />
            ) : (
              <p className="text-muted-foreground">No image available</p>
            )}
          </div>

          {image.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
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
      </main>
      <Footer />
    </>
  );
};

export default ColoringImagePage;
