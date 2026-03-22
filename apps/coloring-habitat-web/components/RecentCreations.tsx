"use client";

import Image from "next/image";
import Link from "next/link";
import { useRecentCreations } from "@/hooks/useRecentCreations";

/**
 * RecentCreations — horizontal scroll of the user's most recent colored artworks.
 * Only renders content when the user is authenticated and has saved artworks.
 */
const RecentCreations = () => {
  const { creations, isLoading } = useRecentCreations(6);

  // Don't render anything while loading or if user has no creations
  if (isLoading || creations.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Your Recent Creations
          </h2>
          <Link
            href="/my-artwork"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {creations.map((creation) => (
            <Link
              key={creation.id}
              href={`/coloring-image/${creation.coloringImageId}`}
              className="group flex-shrink-0"
            >
              <div className="relative h-36 w-36 overflow-hidden rounded-lg border border-border bg-secondary transition-all group-hover:border-foreground/20 group-hover:shadow-md sm:h-44 sm:w-44">
                <Image
                  src={creation.imageUrl}
                  alt={creation.title || "Your colored artwork"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 144px, 176px"
                />
              </div>
              {creation.title && (
                <p className="mt-1.5 max-w-[144px] truncate text-xs text-muted-foreground sm:max-w-[176px]">
                  {creation.title}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentCreations;
