import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPalette,
  faArrowRight,
  faPaintbrush,
} from "@fortawesome/free-solid-svg-icons";
import { differenceInDays, isToday, isYesterday, format } from "date-fns";
import { auth } from "@/auth";
import { getUserSavedArtwork } from "@/app/actions/saved-artwork";
import DeleteArtworkButton from "./DeleteArtworkButton";
import ShareArtworkButton from "./ShareArtworkButton";

export const metadata: Metadata = {
  title: "My Artwork | Coloring Habitat",
  description: "View and manage your saved coloring artwork.",
};

const getFriendlyTime = (date: Date): string => {
  const now = new Date();
  const days = differenceInDays(now, date);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  const isSameYear = date.getFullYear() === now.getFullYear();
  return isSameYear ? format(date, "MMM d") : format(date, "MMM yyyy");
};

const ArtworkGrid = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const savedArtwork = await getUserSavedArtwork();

  if (savedArtwork.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-3xl text-muted-foreground"
          />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          No saved artwork yet
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Start coloring and save your creations to see them here. Your artwork
          will be kept safe in your gallery.
        </p>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Browse Coloring Pages
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {savedArtwork.map((artwork) => (
        <div
          key={artwork.id}
          className="group relative bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-all"
        >
          {/* Artwork Image */}
          <Link
            href={`/coloring-image/${artwork.coloringImageId}`}
            className="block aspect-square relative"
          >
            <Image
              src={artwork.imageUrl}
              alt={artwork.title || "Saved artwork"}
              fill
              className="object-contain p-2"
            />
          </Link>

          {/* Title and Time */}
          <div className="p-3 border-t border-border">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {artwork.title}
            </h3>
            <span className="text-xs text-muted-foreground">
              {getFriendlyTime(new Date(artwork.createdAt))}
            </span>
          </div>

          {/* Action buttons - visible on hover (desktop) or always (mobile) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 md:opacity-0 md:group-hover:opacity-100 md:group-hover:bg-black/20 transition-all duration-200 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <Link
                href={`/coloring-image/${artwork.coloringImageId}`}
                className="flex items-center justify-center size-10 rounded-full bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 transition-all"
                title="Color again"
              >
                <FontAwesomeIcon icon={faPaintbrush} className="text-sm" />
              </Link>
              <ShareArtworkButton
                artworkId={artwork.id}
                artworkTitle={artwork.title || "My Artwork"}
                artworkImageUrl={artwork.imageUrl}
              />
              <DeleteArtworkButton artworkId={artwork.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MyArtworkPage = () => {
  return (
    <>
      <main className="min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              My Artwork
            </h1>
            <p className="text-muted-foreground max-w-lg">
              All your saved coloring creations in one place. Click on any
              artwork to color it again or create a new version.
            </p>
          </div>

          {/* Artwork Grid */}
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <ArtworkGrid />
          </Suspense>
        </div>
      </main>
    </>
  );
};

export default MyArtworkPage;
