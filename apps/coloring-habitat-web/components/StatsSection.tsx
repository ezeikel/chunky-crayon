import { getTranslations } from "next-intl/server";
import {
  faPalette,
  faCalendarDays,
  faImages,
  faShapes,
} from "@fortawesome/free-solid-svg-icons";
import { getGalleryStats } from "@/app/data/gallery";
import AnimatedStatCard from "@/components/AnimatedStatCard";

const StatsSection = async () => {
  const t = await getTranslations("homepage.stats");
  const stats = await getGalleryStats();

  const statItems = [
    {
      icon: faPalette,
      value: stats.totalImages,
      label: t("pagesCreated"),
      color: "text-primary",
      suffix: "+",
    },
    {
      icon: faCalendarDays,
      value: stats.dailyImages,
      label: t("dailyPages"),
      color: "text-accent",
      suffix: "+",
    },
    {
      icon: faImages,
      value: stats.communityImages,
      label: t("freeLibraryPages"),
      color: "text-primary",
      suffix: "+",
    },
    {
      icon: faShapes,
      value: stats.categoryCount,
      label: t("categories"),
      color: "text-accent",
      suffix: "",
    },
  ];

  return (
    <section className="border-y border-border bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {statItems.map((stat) => (
            <AnimatedStatCard
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              color={stat.color}
              suffix={stat.suffix}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
