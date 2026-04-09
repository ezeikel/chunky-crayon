"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import cn from "@/utils/cn";

// Define Difficulty locally to avoid importing from @one-colored-pixel/db in client component
const Difficulty = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  EXPERT: "EXPERT",
} as const;

type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

type DifficultyFilterProps = {
  currentDifficulty?: Difficulty | null;
  counts?: Record<Difficulty, number>;
  className?: string;
};

const DIFFICULTY_STYLE: Record<
  Difficulty,
  {
    key: "beginner" | "intermediate" | "advanced" | "expert";
    color: string;
    bgColor: string;
    hoverBg: string;
    activeBg: string;
  }
> = {
  [Difficulty.BEGINNER]: {
    key: "beginner",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-100",
    activeBg: "bg-emerald-600 text-white",
  },
  [Difficulty.INTERMEDIATE]: {
    key: "intermediate",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    hoverBg: "hover:bg-amber-100",
    activeBg: "bg-amber-600 text-white",
  },
  [Difficulty.ADVANCED]: {
    key: "advanced",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
    activeBg: "bg-blue-600 text-white",
  },
  [Difficulty.EXPERT]: {
    key: "expert",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    hoverBg: "hover:bg-purple-100",
    activeBg: "bg-purple-600 text-white",
  },
};

const DifficultyFilter = ({
  currentDifficulty,
  counts,
  className,
}: DifficultyFilterProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("gallery");

  const handleDifficultyChange = (difficulty: Difficulty | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (difficulty) {
      params.set("difficulty", difficulty.toLowerCase());
    } else {
      params.delete("difficulty");
    }

    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const isActive = (difficulty: Difficulty | null) => {
    return currentDifficulty === difficulty;
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* All button */}
      <button
        type="button"
        onClick={() => handleDifficultyChange(null)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
          isActive(null)
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        {t("filters.all")}
        {counts && (
          <span className="text-xs opacity-70">
            ({Object.values(counts).reduce((a, b) => a + b, 0)})
          </span>
        )}
      </button>

      {/* Difficulty buttons */}
      {Object.entries(DIFFICULTY_STYLE).map(([key, style]) => {
        const difficulty = key as Difficulty;
        const count = counts?.[difficulty] || 0;
        const active = isActive(difficulty);

        return (
          <button
            key={difficulty}
            type="button"
            onClick={() => handleDifficultyChange(difficulty)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              active
                ? cn(style.activeBg, "border-transparent")
                : cn(
                    "border-border bg-background",
                    style.hoverBg,
                    "hover:border-transparent",
                  ),
            )}
          >
            <span className="hidden sm:inline">
              {t(`difficulty.${style.key}.title`)}
            </span>
            <span className="sm:hidden">
              {t(`difficulty.${style.key}.shortLabel`)}
            </span>
            {count > 0 && (
              <span
                className={cn("text-xs", active ? "opacity-80" : "opacity-60")}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DifficultyFilter;
