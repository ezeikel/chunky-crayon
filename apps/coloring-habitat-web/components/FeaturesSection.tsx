import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faPaintbrush,
  faDownload,
  faSeedling,
} from "@fortawesome/free-solid-svg-icons";

const stepIcons = [faWandMagicSparkles, faPaintbrush, faDownload, faSeedling];

const FeaturesSection = async () => {
  const t = await getTranslations("homepage.features");

  return (
    <section className="border-t border-border bg-secondary py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <Image
                src="/images/hero-coloring.jpg"
                alt="Close-up of hands coloring an intricate mandala with colored pencils"
                width={640}
                height={480}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-2 rounded-xl border border-border bg-background px-5 py-3 shadow-lg sm:right-6">
              <p className="text-2xl font-extrabold text-foreground">68%</p>
              <p className="text-xs text-muted-foreground">
                {t("stressReduction")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {t("badge")}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                <FontAwesomeIcon icon={stepIcons[i - 1]} size="sm" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("step", { number: i })}
              </p>
              <h3 className="mt-2 text-base font-bold text-foreground">
                {t(`steps.${i}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${i}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
