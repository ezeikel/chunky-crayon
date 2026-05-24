'use server';

import { db, GenerationType, Prisma, Difficulty } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import type { PaginatedImagesResponse } from '@/app/data/coloring-image';
import { GALLERY_IMAGE_SELECT } from '@/app/data/coloring-image';
import { GALLERY_PAGE_SIZE, getDifficultyFromSlug } from '@/app/data/gallery';
import { getCategoryBySlug } from '@/constants';
import { getComboPageBySlug } from '@/lib/seo/combo-pages';

export type GalleryType =
  | 'community'
  | 'system'
  | 'daily'
  | 'category'
  | 'difficulty'
  | 'tag'
  | 'combo';

/**
 * Server action to load more gallery images for infinite scroll.
 *
 * Two distinct surfaces:
 *   - `community` = user-generated content (UGC). userId NOT NULL AND
 *     showInCommunity=true. Powers /gallery/community + the
 *     "Community Creations" section on /gallery.
 *   - `system` = curated content we generated (daily image cron + the
 *     936-row landing backfill + ads + etc). userId IS NULL. Powers
 *     the main "Our Latest" feed + age/category/difficulty/tag pages.
 *
 * Historical bug: the pre-2026-05 code used a single `community` type
 * filtered by `userId: null`, conflating the two surfaces. /gallery/community
 * was actually showing SYSTEM content. Fixed here by splitting the cases
 * and flipping `community` to the honest UGC filter.
 *
 * Other gallery types (all SYSTEM filtered): daily, category, difficulty,
 * tag, and combo (composite theme × age × occasion/context pages, powers
 * /coloring-pages-for/[slug]).
 */
export async function loadGalleryImages(
  galleryType: GalleryType,
  cursor: string,
  categorySlug?: string,
  difficultySlug?: string,
  tagSlug?: string,
  comboSlug?: string,
): Promise<PaginatedImagesResponse> {
  const limit = GALLERY_PAGE_SIZE;

  // Every branch below needs status=READY so streaming-pipeline rows in
  // GENERATING / FAILED don't leak into infinite-scroll gallery loads.
  const baseWhere = {
    brand: BRAND,
    status: 'READY' as const,
  };

  let whereClause: Prisma.ColoringImageWhereInput = baseWhere;

  switch (galleryType) {
    case 'community':
      // Anonymous external creations: guest free-creates (USER) AND
      // #drawthis IG/FB comment replies (COMMENT_REQUEST). Mirrors
      // getCommunityImagesBase in app/data/gallery.ts — signed-in
      // users' saved kid art is never community-eligible on CC (3-8yo;
      // no public-share opt-in). See
      // `feedback_cc_no_community_for_logged_in`.
      whereClause = {
        ...baseWhere,
        userId: null,
        generationType: {
          in: [GenerationType.USER, GenerationType.COMMENT_REQUEST],
        },
      };
      break;

    case 'system':
      // Everything WE generated. The 936-row landing backfill + daily
      // cron output + ad assets. Used by the main /gallery "Our Latest"
      // feed and the various age/category landings underneath it.
      whereClause = { ...baseWhere, userId: null };
      break;

    case 'daily':
      whereClause = { ...baseWhere, generationType: GenerationType.DAILY };
      break;

    case 'category':
      if (!categorySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const category = getCategoryBySlug(categorySlug);
      if (!category) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        OR: [
          { tags: { hasSome: category.tags } },
          ...category.tags.map((tag) => ({
            OR: [
              { title: { contains: tag, mode: 'insensitive' as const } },
              { description: { contains: tag, mode: 'insensitive' as const } },
            ],
          })),
        ],
        userId: null,
      };
      break;

    case 'difficulty':
      if (!difficultySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const difficulty = getDifficultyFromSlug(difficultySlug);
      if (!difficulty) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        difficulty,
        userId: null,
      };
      break;

    case 'tag':
      if (!tagSlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        tags: { has: tagSlug },
        userId: null,
      };
      break;

    case 'combo': {
      if (!comboSlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const combo = getComboPageBySlug(comboSlug);
      if (!combo) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const andClauses: Prisma.ColoringImageWhereInput[] = [];
      if (combo.categorySlug) {
        const category = getCategoryBySlug(combo.categorySlug);
        if (!category) {
          return { images: [], nextCursor: null, hasMore: false };
        }
        andClauses.push({
          OR: [
            { tags: { hasSome: category.tags } },
            ...category.tags.map((tag) => ({
              OR: [
                { title: { contains: tag, mode: 'insensitive' as const } },
                {
                  description: { contains: tag, mode: 'insensitive' as const },
                },
              ],
            })),
          ],
        });
      }
      if (combo.extraTagsAny && combo.extraTagsAny.length > 0) {
        andClauses.push({ tags: { hasSome: combo.extraTagsAny } });
      }
      whereClause = {
        ...baseWhere,
        userId: null,
        ...(combo.difficulty ? { difficulty: combo.difficulty } : {}),
        ...(andClauses.length > 0 ? { AND: andClauses } : {}),
      };
      break;
    }
  }

  const images = await db.coloringImage.findMany({
    where: whereClause,
    select: {
      ...GALLERY_IMAGE_SELECT,
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    cursor: { id: cursor },
    skip: 1,
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
}
