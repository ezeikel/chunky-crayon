import { ImageResponse } from 'next/og';
import { translations } from '@chunky-crayon/translations';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import { getBlogPostForOG } from '@/lib/og/data';
import { urlFor } from '@/lib/sanity';

export const runtime = 'nodejs';

export const alt = 'Blog Post - Chunky Crayon';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export default async function Image({ params }: Props) {
  const { slug, locale } = await params;
  const t = (
    translations[locale as keyof typeof translations] as typeof translations.en
  ).og;

  const [fonts, post] = await Promise.all([
    loadOGFonts(),
    getBlogPostForOG(slug),
  ]);

  const [tondoBold, rooneySansRegular, rooneySansBold] = fonts;

  // Fallback to generic if post not found
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.bgCreamDark} 100%)`,
            fontFamily: OG_FONT_CONFIG.rooneySans.name,
          }}
        >
          <span
            style={{
              fontFamily: OG_FONT_CONFIG.tondo.name,
              fontSize: '48px',
              fontWeight: 700,
              color: colors.crayonOrange,
            }}
          >
            {t.blogPost.notFound}
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: OG_FONT_CONFIG.tondo.name, data: tondoBold, weight: 700 },
          {
            name: OG_FONT_CONFIG.rooneySans.name,
            data: rooneySansRegular,
            weight: 400,
          },
        ],
      },
    );
  }

  // Generate featured image URL if available
  const featuredImageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(800).height(600).url()
    : null;

  // Generate author avatar URL if available
  const authorAvatarUrl = post.author?.image
    ? urlFor(post.author.image).width(80).height(80).url()
    : null;

  // Format date using locale
  const formattedDate = new Date(post.publishedAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Display max 2 categories
  const displayCategories = post.categories.slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 40%, ${colors.bgCreamDark} 100%)`,
          fontFamily: OG_FONT_CONFIG.rooneySans.name,
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative crayon stripes at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            height: '10px',
          }}
        >
          {crayonColors.map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            backgroundColor: colors.crayonPinkLight,
            opacity: 0.4,
          }}
        />

        {/* Left side: Featured image */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '420px',
            height: '100%',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '380px',
              height: '380px',
              backgroundColor: colors.bgWhite,
              borderRadius: '24px',
              boxShadow: `0 8px 32px rgba(227, 119, 72, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)`,
              padding: '16px',
              overflow: 'hidden',
            }}
          >
            {featuredImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredImageUrl}
                alt={post.featuredImage?.alt || post.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '16px',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: colors.bgCreamDark,
                  borderRadius: '16px',
                  fontSize: '60px',
                }}
              >
                📝
              </div>
            )}
          </div>
        </div>

        {/* Right side: Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingLeft: '48px',
            paddingRight: '24px',
            gap: '16px',
          }}
        >
          {/* Categories */}
          {displayCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {displayCategories.map((category, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: category.color
                      ? `${category.color}30`
                      : `${colors.crayonPink}30`,
                    color: category.color || colors.crayonPinkDark,
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {category.title}
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontFamily: OG_FONT_CONFIG.tondo.name,
              fontSize: '44px',
              fontWeight: 700,
              color: colors.textPrimary,
              lineHeight: 1.15,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p
              style={{
                fontSize: '20px',
                fontWeight: 400,
                color: colors.textSecondary,
                lineHeight: 1.4,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Author & Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '8px',
            }}
          >
            {/* Author */}
            {post.author && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authorAvatarUrl}
                    alt={post.author.name}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: colors.crayonOrangeLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: colors.crayonOrangeDark,
                    }}
                  >
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {post.author.name}
                </span>
              </div>
            )}

            {/* Separator */}
            {post.author && (
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: colors.textMuted,
                }}
              />
            )}

            {/* Date */}
            <span
              style={{
                fontSize: '16px',
                color: colors.textSecondary,
              }}
            >
              {formattedDate}
            </span>

            {/* Read time */}
            {post.readTime && (
              <>
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: colors.textMuted,
                  }}
                />
                <span
                  style={{
                    fontSize: '16px',
                    color: colors.textSecondary,
                  }}
                >
                  {t.blogPost.minRead.replace(
                    '{minutes}',
                    String(post.readTime),
                  )}
                </span>
              </>
            )}
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto',
              paddingTop: '16px',
            }}
          >
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '24px',
                fontWeight: 700,
                color: colors.crayonOrange,
              }}
            >
              Chunky
            </span>
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '24px',
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Crayon
            </span>
            <span
              style={{
                fontSize: '18px',
                color: colors.textMuted,
                marginLeft: '8px',
              }}
            >
              {t.blogPost.blog}
            </span>
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            height: '8px',
          }}
        >
          {[...crayonColors].reverse().map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: OG_FONT_CONFIG.tondo.name,
          data: tondoBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: OG_FONT_CONFIG.rooneySans.name,
          data: rooneySansRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: OG_FONT_CONFIG.rooneySans.name,
          data: rooneySansBold,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}
