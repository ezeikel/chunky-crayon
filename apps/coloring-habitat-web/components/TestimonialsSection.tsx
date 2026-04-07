"use client";

import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faApple, faGooglePlay } from "@fortawesome/free-brands-svg-icons";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";

const reviews = [
  {
    name: "Sarah M.",
    location: "London",
    quote:
      "Coloring Habitat has become my evening ritual. The designs are beautifully intricate and the online canvas is incredibly soothing.",
    rating: 5,
    pagesColored: 35,
    timeAgo: "2 weeks ago",
  },
  {
    name: "James K.",
    location: "Bristol",
    quote:
      "I was skeptical about coloring as a hobby, but this genuinely helps me decompress after long work days. The designs are stunning.",
    rating: 5,
    pagesColored: 52,
    timeAgo: "1 week ago",
  },
  {
    name: "Priya S.",
    location: "Manchester",
    quote:
      "The daily free page is such a lovely touch. I actually look forward to my morning inbox now. Perfect for mindfulness.",
    rating: 5,
    pagesColored: 28,
    timeAgo: "3 weeks ago",
  },
  {
    name: "Tom D.",
    location: "Birmingham",
    quote:
      "Printed a whole stack for a rainy Sunday. The detail level is remarkable and the print quality is perfect every time.",
    rating: 5,
    pagesColored: 64,
    timeAgo: "1 month ago",
  },
  {
    name: "Emma L.",
    location: "Leeds",
    quote:
      "Better than any coloring book I have bought. Endless variety and I can create exactly what I am in the mood for.",
    rating: 5,
    pagesColored: 41,
    timeAgo: "2 weeks ago",
  },
  {
    name: "Michael R.",
    location: "Edinburgh",
    quote:
      "My therapist recommended coloring for anxiety. This app makes it so easy to get started. Genuinely calming.",
    rating: 5,
    pagesColored: 73,
    timeAgo: "3 weeks ago",
  },
];

const TestimonialsSection = () => {
  const t = useTranslations("homepage.testimonials");

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <span className="text-6xl font-extrabold tracking-tight text-foreground">
              4.9
            </span>
            <div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStarSolid}
                    size="sm"
                    className="text-amber-400"
                  />
                ))}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("fromReviews", { count: "2,847" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="10" fill="#00B67A" />
                <path
                  d="M10 3l2.2 4.5 5 .7-3.6 3.5.9 5L10 14.3 5.5 16.7l.9-5L2.8 8.2l5-.7L10 3z"
                  fill="#fff"
                />
              </svg>
              Trustpilot
            </span>
            <span className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faApple}
                size="lg"
                className="text-foreground"
              />
              App Store
            </span>
            <span className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faGooglePlay}
                size="lg"
                className="text-foreground"
              />
              Google Play
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStarSolid}
                    size="sm"
                    className="text-amber-400"
                  />
                ))}
              </div>

              <blockquote className="mt-4 flex-1 text-sm italic leading-relaxed text-foreground/80">
                &ldquo;{review.quote}&rdquo;
              </blockquote>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {review.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {review.location}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    <FontAwesomeIcon icon={faCircleCheck} size="xs" />
                    {t("pagesColored", { count: review.pagesColored })}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.timeAgo}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
