"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faKeyboard,
  faMicrophone,
  faCamera,
  faArrowRight,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

type InputMode = "type" | "talk" | "photo";

const modes: { id: InputMode; label: string; icon: typeof faKeyboard }[] = [
  { id: "type", label: "Type", icon: faKeyboard },
  { id: "talk", label: "Talk", icon: faMicrophone },
  { id: "photo", label: "Photo", icon: faCamera },
];

const SUGGESTIONS = [
  "Zen garden at sunset",
  "Art Nouveau florals",
  "Coral reef",
  "Cozy forest cabin",
];

const HeroSection = () => {
  const [activeMode, setActiveMode] = useState<InputMode>("type");
  const [prompt, setPrompt] = useState("");

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
          <div className="rounded-2xl border border-border bg-background shadow-lg">
            {/* Mode tabs */}
            <div className="flex border-b border-border">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveMode(mode.id)}
                  className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
                    activeMode === mode.id
                      ? "border-b-2 border-foreground text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={activeMode === mode.id}
                >
                  <FontAwesomeIcon icon={mode.icon} size="sm" />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="p-5">
              {activeMode === "type" && (
                <>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. a serene Japanese garden with koi and cherry blossoms..."
                    className="min-h-24 w-full resize-none rounded-xl border border-border bg-secondary p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    aria-label="Describe your coloring page"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPrompt(s)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeMode === "talk" && (
                <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-secondary p-6">
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-105"
                    aria-label="Start recording"
                  >
                    <FontAwesomeIcon icon={faMicrophone} size="lg" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Tap to describe your page
                  </span>
                </div>
              )}

              {activeMode === "photo" && (
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary p-6 transition-colors hover:border-foreground/30">
                  <FontAwesomeIcon
                    icon={faCamera}
                    size="lg"
                    className="text-muted-foreground"
                  />
                  <span className="text-sm text-muted-foreground">
                    Upload a photo to transform
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Upload a photo"
                  />
                </label>
              )}

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-bold text-primary-foreground transition-shadow hover:shadow-md"
              >
                Create my page
                <FontAwesomeIcon icon={faArrowRight} size="sm" />
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                2 free creations daily &middot; No account needed
              </p>
            </div>
          </div>
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
