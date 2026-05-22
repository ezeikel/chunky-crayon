'use client';

/**
 * Tiny imperative API for opening the in-form PaywallModal.
 *
 * The modal is mounted by `CreateColoringPageForm` and triggered from
 * many places (FormCTA, Scene wizard, form-action guard). All callers
 * use this hook so they share one piece of open/close + triggerLocation
 * state.
 *
 * No context — one form, one paywall instance per page. If we ever
 * mount multiple forms on the same page we'll revisit, but today the
 * form lives once on /start and once on the homepage and they're never
 * co-rendered.
 *
 * The user state ('guest_limit' / 'no_subscription' / 'subscriber_no_credits')
 * is derived by the modal itself from `useUser()` at render time, not
 * stored here. That way if the user signs in via a different tab while
 * the modal is open, the modal re-renders with the right ladder.
 */

import { useCallback, useState } from 'react';

export type UsePaywallResult = {
  /** Whether the modal is currently shown. */
  open: boolean;
  /** Last `triggerLocation` passed to `openPaywall`. Forwarded to events. */
  triggerLocation: string;
  /**
   * Open the paywall.
   * @param triggerLocation Short, stable string identifying where the
   *   block was hit (e.g. 'formcta_create_button', 'scene_wizard_create',
   *   'form_submit_enter_key'). Sent with PAYWALL_VIEWED so we can
   *   attribute conversions back to the original block surface.
   */
  openPaywall: (triggerLocation: string) => void;
  /** Programmatic close. Does NOT fire PAYWALL_DISMISSED — the modal's
   *  own onOpenChange does. Use this for "modal closed because the
   *  user navigated away" type transitions. */
  closePaywall: () => void;
  /** Direct setter for `<PaywallModal />` to use as onOpenChange. */
  setOpen: (open: boolean) => void;
};

export const usePaywall = (): UsePaywallResult => {
  const [open, setOpen] = useState(false);
  const [triggerLocation, setTriggerLocation] = useState('unknown');

  const openPaywall = useCallback((nextTrigger: string) => {
    setTriggerLocation(nextTrigger);
    setOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, triggerLocation, openPaywall, closePaywall, setOpen };
};

export default usePaywall;
