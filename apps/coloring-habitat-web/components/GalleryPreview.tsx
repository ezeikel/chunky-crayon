import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { getFeaturedImages, getLatestDailyImage } from "@/app/data/gallery";
import { GALLERY_CATEGORIES } from "@/constants";

const GalleryPreview = async () => {
  const t = await getTranslations("homepage.galleryPreview");
  const [featuredImages, dailyImage] = await Promise.all([
    getFeaturedImages(6),
    getLatestDailyImage(),
  ]);

  // Use real images, filtered to those with SVGs
  const images = featuredImages.filter((img) => img.svgUrl);

  if (images.length === 0) return null;

  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/gallery"
            className="hidden items-center gap-2 rounded-full border-2 border-foreground/15 px-6 py-3 text-sm font-bold text-foreground transition-all hover:border-foreground/30 sm:inline-flex"
          >
            {t("viewAll")}
            <FontAwesomeIcon icon={faArrowRight} size="sm" />
          </Link>
        </div>

        {/* Category pills */}
        <div className="mt-8 flex flex-wrap gap-2">
          {GALLERY_CATEGORIES.slice(0, 8).map((cat) => (
            <Link
              key={cat.slug}
              href={`/gallery/${cat.slug}`}
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Image grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <Link
              key={image.id}
              href={`/coloring-image/${image.id}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={image.svgUrl!}
                  alt={image.title || "Coloring page"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-foreground line-clamp-1">
                  {image.title || "Coloring Page"}
                </h3>
                {image.tags && image.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {image.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Daily image callout */}
        {dailyImage && dailyImage.svgUrl && (
          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={`/coloring-image/${dailyImage.id}`}
                className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-md"
              >
                <Image
                  src={dailyImage.svgUrl}
                  alt={dailyImage.title || "Today's coloring page"}
                  fill
                  className="object-cover"
                />
              </Link>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">
                  {t("dailyPage")}
                </p>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  {dailyImage.title || "Today's Coloring Page"}
                </h3>
              </div>
              <Link
                href={`/coloring-image/${dailyImage.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("colorNow")}
                <FontAwesomeIcon icon={faArrowRight} size="sm" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-full border-2 border-foreground/15 px-6 py-3 text-sm font-bold text-foreground"
          >
            {t("viewAll")}
            <FontAwesomeIcon icon={faArrowRight} size="sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GalleryPreview;
