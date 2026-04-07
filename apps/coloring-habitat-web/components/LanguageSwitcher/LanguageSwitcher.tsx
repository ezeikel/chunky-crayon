"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, type Locale } from "@/i18n/routing";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import cn from "@/utils/cn";

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

const LANGUAGE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  ja: "🇯🇵",
  ko: "🇰🇷",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
};

const LOCALES: Locale[] = ["en", "ja", "ko", "de", "fr", "es"];

type LanguageSwitcherProps = {
  className?: string;
  variant?: "icon" | "full" | "compact";
};

const LanguageSwitcher = ({
  className,
  variant = "icon",
}: LanguageSwitcherProps) => {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleLocaleChange = (newLocale: Locale) => {
    // @ts-expect-error - next-intl router expects specific pathname types but we're using dynamic routes
    router.replace({ pathname, params }, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 font-semibold text-foreground/60 hover:text-primary transition-colors focus:outline-none",
          className,
        )}
        aria-label={t("switchLanguage")}
      >
        {variant === "icon" && (
          <FontAwesomeIcon icon={faGlobe} className="text-xl" />
        )}
        {variant === "full" && (
          <>
            <FontAwesomeIcon icon={faGlobe} className="text-xl" />
            <span>{LANGUAGE_NAMES[locale]}</span>
          </>
        )}
        {variant === "compact" && (
          <>
            <span className="text-lg">{LANGUAGE_FLAGS[locale]}</span>
            <span className="text-sm uppercase">{locale}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              locale === loc && "bg-primary/10 text-primary",
            )}
          >
            <span className="text-lg">{LANGUAGE_FLAGS[loc]}</span>
            <span className="flex-1">{LANGUAGE_NAMES[loc]}</span>
            {locale === loc && <span className="text-primary text-sm">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
