"use client";

import * as React from "react";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faSpinnerThird,
} from "@fortawesome/pro-duotone-svg-icons";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const iconClass = "leading-none fa-duotone shrink-0 toast-icon-pop";

const iconSize: React.CSSProperties = {
  fontSize: "1.875rem",
  width: "1.875rem",
  height: "1.875rem",
};

const duotone = (
  primary: string,
  secondary: string,
  primaryOpacity = "1",
  secondaryOpacity = "0.85",
): React.CSSProperties =>
  ({
    "--fa-primary-color": primary,
    "--fa-secondary-color": secondary,
    "--fa-primary-opacity": primaryOpacity,
    "--fa-secondary-opacity": secondaryOpacity,
  }) as React.CSSProperties;

const variantIcons = {
  success: (
    <FontAwesomeIcon
      icon={faCircleCheck}
      className={iconClass}
      style={{
        ...iconSize,
        ...duotone(
          "var(--color-coloring-success-bg-dark)",
          "var(--color-coloring-success-on)",
        ),
      }}
    />
  ),
  error: (
    <FontAwesomeIcon
      icon={faCircleExclamation}
      className={iconClass}
      style={{
        ...iconSize,
        ...duotone(
          "var(--color-coloring-error-bg-dark)",
          "var(--color-coloring-error-on)",
        ),
      }}
    />
  ),
  info: (
    <FontAwesomeIcon
      icon={faCircleInfo}
      className={iconClass}
      style={{
        ...iconSize,
        ...duotone(
          "var(--color-coloring-info-bg-dark)",
          "var(--color-coloring-info-on)",
        ),
      }}
    />
  ),
  warning: (
    <FontAwesomeIcon
      icon={faTriangleExclamation}
      className={iconClass}
      style={{
        ...iconSize,
        ...duotone(
          "var(--color-coloring-warning-on)",
          "var(--color-coloring-warning-bg-dark)",
          "1",
          "0.95",
        ),
      }}
    />
  ),
  loading: (
    <FontAwesomeIcon
      icon={faSpinnerThird}
      className="leading-none fa-duotone shrink-0 animate-spin"
      style={{
        fontSize: "2rem",
        width: "2rem",
        height: "2rem",
        ...duotone(
          "var(--color-coloring-loading-on)",
          "var(--color-coloring-loading-bg-dark)",
        ),
      }}
    />
  ),
};

// Sonner's richColors mode reads --success-bg / --error-bg / --warning-bg /
// --info-bg / --normal-bg (loading uses normal). We map each to our brand vars
// and use a per-variant chunky bottom-drop shadow.
const toasterStyle = {
  "--normal-bg": "var(--color-coloring-loading-bg)",
  "--normal-text": "var(--color-coloring-loading-on)",
  "--normal-border": "var(--color-coloring-loading-bg-dark)",

  "--success-bg": "var(--color-coloring-success-bg)",
  "--success-text": "var(--color-coloring-success-on)",
  "--success-border": "var(--color-coloring-success-bg-dark)",

  "--error-bg": "var(--color-coloring-error-bg)",
  "--error-text": "var(--color-coloring-error-on)",
  "--error-border": "var(--color-coloring-error-bg-dark)",

  "--info-bg": "var(--color-coloring-info-bg)",
  "--info-text": "var(--color-coloring-info-on)",
  "--info-border": "var(--color-coloring-info-bg-dark)",

  "--warning-bg": "var(--color-coloring-warning-bg)",
  "--warning-text": "var(--color-coloring-warning-on)",
  "--warning-border": "var(--color-coloring-warning-bg-dark)",

  "--border-radius": "var(--radius-coloring-card)",
  fontFamily: "var(--font-coloring-body)",
} as React.CSSProperties;

// Per-variant chunky lift using each variant's *-bg-dark colour. Class names
// are needed because sonner hardcodes box-shadow on [data-styled='true'].
const chunky = "0 6px 0 0 var(--bottom), 0 10px 24px -8px rgb(0 0 0 / 0.18)";

const Toaster = (props: ToasterProps) => (
  <SonnerToaster
    position="top-center"
    closeButton
    richColors
    gap={28}
    duration={4000}
    icons={variantIcons}
    style={toasterStyle}
    toastOptions={{
      // Inline style sets the chunky shadow + radius in a way that wins over
      // sonner's internal CSS without needing !important everywhere.
      style: {
        boxShadow: chunky,
        borderRadius: "var(--radius-coloring-card)",
        border: "0",
        padding: "0.875rem 3rem 0.875rem 1rem",
        gap: "1rem",
        alignItems: "center",
        animation:
          "bounce-in var(--duration-coloring-base, 200ms) var(--ease-coloring, cubic-bezier(0.34, 1.56, 0.64, 1))",
      },
      classNames: {
        // CSS var --bottom is set per data-type below via inline-style hack:
        // we set a CSS variable per variant in toast classNames so the shadow
        // template `0 6px 0 0 var(--bottom)` resolves to the dark colour.
        toast:
          "[--bottom:var(--color-coloring-loading-bg-dark)] data-[type=success]:[--bottom:var(--color-coloring-success-bg-dark)] data-[type=error]:[--bottom:var(--color-coloring-error-bg-dark)] data-[type=info]:[--bottom:var(--color-coloring-info-bg-dark)] data-[type=warning]:[--bottom:var(--color-coloring-warning-bg-dark)]",
        title:
          "!font-[var(--coloring-weight-emphasis,700)] !text-[1rem] !leading-tight",
        description:
          "!text-[0.875rem] !font-[var(--coloring-weight-body,500)] !opacity-90",
        actionButton:
          "!bg-white/95 !text-coloring-text-primary !rounded-coloring-button !px-3 !py-1.5 !text-[0.8125rem] !font-[var(--coloring-weight-emphasis,700)] !shadow-[0_3px_0_0_rgb(0_0_0_/_0.12)]",
        cancelButton:
          "!bg-black/10 !text-current !rounded-coloring-button !px-3 !py-1.5 !text-[0.8125rem] !font-[var(--coloring-weight-emphasis,700)]",
      },
    }}
    {...props}
  />
);

export { Toaster, sonnerToast as toast };
