import { trackEvent } from "./events";

/**
 * Fire `blog_post_view` once per page load when the page is a blog post.
 * Reads data-blog-slug / data-blog-title off the <article> so all analytics
 * wiring stays in the shared bundle (same pattern as cc-link-tracking).
 */
if (typeof document !== "undefined") {
  const article = document.querySelector<HTMLElement>(
    "article[data-blog-slug]",
  );
  if (article) {
    trackEvent("blog_post_view", {
      slug: article.dataset.blogSlug ?? "",
      title: article.dataset.blogTitle ?? "",
    });
  }
}
