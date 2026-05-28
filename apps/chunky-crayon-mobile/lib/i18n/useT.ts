import { useTranslation } from "react-i18next";

/**
 * Web-parity translation hook. CC web (next-intl) uses:
 *   const t = useTranslations("namespace");
 *   t("key")            // → resolves "namespace.key"
 *
 * react-i18next's native hook returns a global `t` where you pass the
 * full dot-path. This wrapper scopes it to a namespace prefix so ported
 * web components keep their `t("key")` call sites with minimal edits.
 *
 * Usage:
 *   const t = useT("mobile.tabs");
 *   t("home")           // → "mobile.tabs.home"
 *   t("home", { count }) // interpolation params pass through
 *
 * Omit the prefix to get the raw global t (full dot-paths):
 *   const t = useT();
 *   t("common.save")
 */
export function useT(prefix?: string) {
  const { t } = useTranslation();
  if (!prefix) return t;
  return (key: string, params?: Record<string, unknown>) =>
    t(`${prefix}.${key}`, params);
}
