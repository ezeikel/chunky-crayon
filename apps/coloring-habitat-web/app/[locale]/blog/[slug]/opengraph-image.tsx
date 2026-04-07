import { ImageResponse } from "next/og";
import { loadOGFonts, OG_FONT_CONFIG } from "@/lib/og/fonts";
import { colors, OG_WIDTH, OG_HEIGHT, accentColors } from "@/lib/og/constants";
import { getBlogPostForOG } from "@/lib/og/data";
import { urlFor } from "@/lib/sanity";

export const runtime = "nodejs";

export const alt = "Blog Post - Coloring Habitat";
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;

  const [fonts, post] = await Promise.all([
    loadOGFonts(),
    getBlogPostForOG(slug),
  ]);

  const [jakartaRegular, jakartaBold, jakartaExtraBold] = fonts;

  // Fallback if post not found
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.bgCreamDark} 100%)`,
            fontFamily: OG_FONT_CONFIG.jakarta.name,
          }}
        >
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: colors.primary,
            }}
          >
            Coloring Habitat Blog
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: OG_FONT_CONFIG.jakarta.name,
            data: jakartaExtraBold,
            weight: 800 as const,
          },
        ],
      },
    );
  }

  const featuredImageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(800).height(600).url()
    : null;

  const authorAvatarUrl = post.author?.image
    ? urlFor(post.author.image).width(80).height(80).url()
    : null;

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const displayCategories = post.categories.slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.sageLight} 40%, ${colors.bgCreamDark} 100%)`,
          fontFamily: OG_FONT_CONFIG.jakarta.name,
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            height: "10px",
          }}
        >
          {accentColors.map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            backgroundColor: colors.lavenderLight,
            opacity: 0.4,
          }}
        />

        {/* Left side: Featured image */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "420px",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "380px",
              height: "380px",
              backgroundColor: colors.bgWhite,
              borderRadius: "24px",
              boxShadow:
                "0 8px 32px rgba(45, 106, 79, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)",
              padding: "16px",
              overflow: "hidden",
            }}
          >
            {featuredImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredImageUrl}
                alt={post.featuredImage?.alt || post.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "16px",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  backgroundColor: colors.bgCreamDark,
                  borderRadius: "16px",
                  fontSize: "60px",
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingLeft: "48px",
            paddingRight: "24px",
            gap: "16px",
          }}
        >
          {/* Categories */}
          {displayCategories.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {displayCategories.map((category, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: category.color
                      ? `${category.color}30`
                      : `${colors.primaryLight}30`,
                    color: category.color || colors.primaryDark,
                    padding: "6px 14px",
                    borderRadius: "100px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
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
              fontSize: "44px",
              fontWeight: 800,
              color: colors.textPrimary,
              lineHeight: 1.15,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p
              style={{
                fontSize: "20px",
                fontWeight: 400,
                color: colors.textSecondary,
                lineHeight: 1.4,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Author & Meta */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            {post.author && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authorAvatarUrl}
                    alt={post.author.name}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: colors.sageLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: colors.primaryDark,
                    }}
                  >
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {post.author.name}
                </span>
              </div>
            )}

            {post.author && (
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: colors.textMuted,
                }}
              />
            )}

            <span
              style={{
                fontSize: "16px",
                color: colors.textSecondary,
              }}
            >
              {formattedDate}
            </span>

            {post.readTime && (
              <>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: colors.textMuted,
                  }}
                />
                <span
                  style={{
                    fontSize: "16px",
                    color: colors.textSecondary,
                  }}
                >
                  {post.readTime} min read
                </span>
              </>
            )}
          </div>

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "auto",
              paddingTop: "16px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: colors.primary,
              }}
            >
              Coloring Habitat
            </span>
            <span
              style={{
                fontSize: "18px",
                color: colors.textMuted,
                marginLeft: "8px",
              }}
            >
              Blog
            </span>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            height: "8px",
          }}
        >
          {[...accentColors].reverse().map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaRegular,
          weight: 400 as const,
          style: "normal" as const,
        },
        {
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaBold,
          weight: 700 as const,
          style: "normal" as const,
        },
        {
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaExtraBold,
          weight: 800 as const,
          style: "normal" as const,
        },
      ],
    },
  );
}
