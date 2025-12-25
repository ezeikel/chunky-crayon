import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarStar,
  faUsers,
  faArrowRight,
  faSparkles,
  faImages,
} from '@fortawesome/pro-duotone-svg-icons';
import { getTodaysDailyImage, getFeaturedImages } from '@/app/data/gallery';
import { GALLERY_CATEGORIES } from '@/constants';
import DailyImageHeading from './DailyImageHeading';

const DailyImagePreview = async () => {
  const dailyImage = await getTodaysDailyImage();

  if (!dailyImage || !dailyImage.svgUrl) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="bg-gradient-to-br from-crayon-yellow/20 to-crayon-orange/20 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faCalendarStar}
            className="text-xl"
            style={iconStyle}
          />
          <DailyImageHeading createdAt={dailyImage.createdAt} />
        </div>
        <Link
          href="/gallery/daily"
          className="text-sm text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
        >
          See all
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="flex gap-4 items-center">
        <Link
          href={`/coloring-image/${dailyImage.id}`}
          className="relative w-32 h-32 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow group flex-shrink-0"
        >
          <Image
            src={dailyImage.svgUrl}
            alt={dailyImage.title || 'Daily coloring page'}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <h4 className="font-tondo font-semibold text-text-primary truncate mb-2">
            {dailyImage.title || 'Daily Coloring Page'}
          </h4>
          <Link
            href={`/coloring-image/${dailyImage.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-crayon-orange text-white text-sm font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            <FontAwesomeIcon icon={faSparkles} className="text-xs" />
            Color Now
          </Link>
        </div>
      </div>
    </div>
  );
};

const CommunityPreview = async () => {
  const allImages = await getFeaturedImages(4);
  const images = allImages.filter((img) => img.svgUrl);

  if (images.length === 0) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faUsers}
            className="text-xl"
            style={iconStyle}
          />
          <h3 className="font-tondo font-bold text-lg text-text-primary">
            Community Pages
          </h3>
        </div>
        <Link
          href="/gallery/community"
          className="text-sm text-crayon-purple hover:text-crayon-purple-dark transition-colors flex items-center gap-1"
        >
          See all
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-lg overflow-hidden bg-white border border-paper-cream-dark hover:border-crayon-purple/50 transition-colors group"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || 'Coloring page'}
              fill
              className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

const CategoryPreview = () => {
  // Show a subset of categories
  const featuredCategories = GALLERY_CATEGORIES.slice(0, 6);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="bg-gradient-to-br from-crayon-blue/10 to-crayon-green/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faImages}
            className="text-xl"
            style={iconStyle}
          />
          <h3 className="font-tondo font-bold text-lg text-text-primary">
            Browse Categories
          </h3>
        </div>
        <Link
          href="/gallery"
          className="text-sm text-crayon-blue hover:text-crayon-blue-dark transition-colors flex items-center gap-1"
        >
          View all
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {featuredCategories.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-paper-cream-dark hover:border-crayon-blue/50 hover:bg-crayon-blue/5 transition-colors text-sm"
          >
            <span>{category.emoji}</span>
            <span className="font-medium text-text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const GalleryPreview = async () => {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-tondo font-bold text-2xl text-text-primary">
          Free Coloring Pages
        </h2>
        <Link
          href="/gallery"
          className="text-sm font-semibold text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
        >
          Explore Gallery
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DailyImagePreview />
        <CommunityPreview />
        <CategoryPreview />
      </div>
    </section>
  );
};

export default GalleryPreview;
