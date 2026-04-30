'use client';

import { useFeatureFlagVariantKey, usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

type ExperimentProps<V extends string> = {
  flag: string;
  variants: Record<V, React.ReactNode>;
  defaultVariant: NoInfer<V>;
  exposureProperties?: Record<string, unknown>;
};

export const Experiment = <V extends string>({
  flag,
  variants,
  defaultVariant,
  exposureProperties,
}: ExperimentProps<V>) => {
  const posthog = usePostHog();
  const variant =
    (useFeatureFlagVariantKey(flag) as V | undefined) ?? defaultVariant;
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    posthog?.capture('experiment_exposed', {
      flag,
      variant,
      ...exposureProperties,
    });
  }, [posthog, flag, variant, exposureProperties]);

  return <>{variants[variant] ?? variants[defaultVariant]}</>;
};
