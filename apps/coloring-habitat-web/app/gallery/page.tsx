import { connection } from "next/server";
import { db } from "@one-colored-pixel/db";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/db";

const GalleryPage = async () => {
  await connection();

  const images = await db.coloringImage.findMany({
    where: { brand: BRAND },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      svgUrl: true,
      difficulty: true,
      tags: true,
    },
  });

  return (
    <>
      <Header />
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Gallery
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse our collection of intricate coloring pages
          </p>

          {images.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="text-lg text-muted-foreground">
                No coloring pages yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <Link
                  key={image.id}
                  href={`/coloring-image/${image.id}`}
                  className="group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                    {image.url && (
                      <Image
                        src={image.url}
                        alt={image.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                    {image.difficulty && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur-sm">
                        {image.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-foreground">{image.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {image.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default GalleryPage;
