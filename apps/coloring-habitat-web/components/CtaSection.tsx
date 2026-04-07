import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { faApple, faGooglePlay } from "@fortawesome/free-brands-svg-icons";
import { Link } from "@/i18n/routing";

const CtaSection = async () => {
  const t = await getTranslations("homepage.cta");

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground transition-all hover:shadow-xl hover:shadow-primary/20"
          >
            {t("startColoring")}
            <FontAwesomeIcon
              icon={faArrowRight}
              size="sm"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full border-2 border-foreground/15 px-8 py-4 text-base font-semibold text-foreground transition-all hover:border-foreground/30"
          >
            {t("viewPlans")}
          </Link>
        </div>

        <div className="mt-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("getTheApp")}
          </p>
          <div className="mt-5 flex items-center justify-center gap-4">
            <a
              href="#"
              aria-label="Download on the App Store"
              className="inline-flex items-center gap-3 rounded-xl bg-foreground px-5 py-3 text-white transition-opacity hover:opacity-90"
            >
              <FontAwesomeIcon icon={faApple} size="2x" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {t("downloadOnAppStore")}
                </span>
                <span className="text-base font-semibold">{t("appStore")}</span>
              </div>
            </a>
            <a
              href="#"
              aria-label="Get it on Google Play"
              className="inline-flex items-center gap-3 rounded-xl bg-foreground px-5 py-3 text-white transition-opacity hover:opacity-90"
            >
              <FontAwesomeIcon icon={faGooglePlay} size="xl" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {t("getItOn")}
                </span>
                <span className="text-base font-semibold">
                  {t("googlePlay")}
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
