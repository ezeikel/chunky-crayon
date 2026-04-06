"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import CreateColoringPageForm from "@/components/forms/CreateColoringPageForm/CreateColoringPageForm";

const HeroSection = () => {
  return (
    <section className="bg-background pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Centered headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Color your way to calm
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Create intricate coloring pages in seconds. Color online or print at
            home. Your daily dose of creative mindfulness.
          </p>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size="sm"
                className="text-accent"
              />
              1,000+ free pages
            </span>
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size="sm"
                className="text-accent"
              />
              No account needed
            </span>
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size="sm"
                className="text-accent"
              />
              Trusted by 50k+ people
            </span>
          </div>
        </div>

        {/* Create form card - centered below headline */}
        <div className="mx-auto mt-10 max-w-xl">
          <CreateColoringPageForm />

          <p className="mt-3 text-center text-xs text-muted-foreground">
            2 free creations daily &middot; No account needed
          </p>
        </div>

        {/* Social proof bar */}
        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {[
              "bg-[#E63956]",
              "bg-[#008489]",
              "bg-[#914669]",
              "bg-[#CFB299]",
            ].map((bg, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-bold text-white ${bg}`}
              >
                {["S", "J", "P", "A"][i]}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <FontAwesomeIcon
                key={i}
                icon={faStar}
                size="xs"
                className="text-foreground"
              />
            ))}
            <span className="ml-1 text-sm font-semibold text-foreground">
              4.9
            </span>
          </div>
          <span className="text-sm text-muted-foreground">&middot;</span>
          <Link
            href="/gallery"
            className="text-sm font-semibold text-foreground underline underline-offset-2"
          >
            50k+ users
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
