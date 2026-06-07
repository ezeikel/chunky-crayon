/**
 * Analytics event-name contract for the mobile app.
 *
 * Event STRING VALUES are copied VERBATIM from the web app's TRACKING_EVENTS
 * (apps/chunky-crayon-web/constants.ts) so web + mobile events land on the same
 * names in the one shared PostHog project and funnels unify cross-platform.
 * Only the subset mobile actually fires is listed (plus mobile-only events the
 * web has no equivalent for — onboarding carousel, profile switching, tab/screen
 * views). When adding an event that ALSO exists on web, copy its exact string.
 *
 * The worker fires server-side `image_generation_completed/failed`; mobile fires
 * the CLIENT-side creation_* lifecycle below, never those.
 */
export const ANALYTICS_EVENTS = {
  // ── Auth (shared with web) ──
  AUTH_SIGN_IN_COMPLETED: "auth_sign_in_completed",
  AUTH_SIGN_UP_COMPLETED: "auth_sign_up_completed",
  AUTH_SIGN_OUT: "auth_sign_out",

  // ── Onboarding (MOBILE-ONLY — web has no carousel) ──
  ONBOARDING_SLIDE_VIEWED: "onboarding_slide_viewed",
  ONBOARDING_SKIPPED: "onboarding_skipped",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_PAYWALL_SHOWN: "onboarding_paywall_shown",

  // ── Profiles (MOBILE-ONLY — kid profile switcher) ──
  PROFILE_SWITCHED: "profile_switched",
  PROFILE_CREATED: "profile_created",
  PROFILE_DELETED: "profile_deleted",

  // ── Generation / create flow (shared with web) ──
  CREATION_SUBMITTED: "creation_submitted",
  CREATION_STARTED: "creation_started",
  CREATION_COMPLETED: "creation_completed",
  CREATION_FAILED: "creation_failed",
  INPUT_MODE_CHANGED: "input_mode_changed",
  VOICE_INPUT_STARTED: "voice_input_started",
  VOICE_INPUT_COMPLETED: "voice_input_completed",
  IMAGE_INPUT_CAPTURED: "image_input_captured",
  IMAGE_INPUT_UPLOADED: "image_input_uploaded",

  // ── Coloring page lifecycle (shared with web) ──
  PAGE_VIEWED: "page_viewed",
  PAGE_FIRST_STROKE: "page_first_stroke",
  PAGE_COLORED: "page_colored",
  PAGE_STROKE_MADE: "page_stroke_made",
  PAGE_COLOR_SELECTED: "page_color_selected",
  TOOL_SELECTED: "tool_selected",
  BRUSH_TYPE_CHANGED: "brush_type_changed",
  BRUSH_SIZE_CHANGED: "brush_size_changed",
  PALETTE_VARIANT_CHANGED: "palette_variant_changed",
  CANVAS_UNDO: "canvas_undo",
  CANVAS_REDO: "canvas_redo",
  AUTO_COLOR_USED: "auto_color_used",
  SAVE_TO_GALLERY_CLICKED: "save_to_gallery_clicked",
  PRINT_CLICKED: "print_clicked",

  // ── Paywall / purchase (shared with web) ──
  PAYWALL_VIEWED: "paywall_viewed",
  PAYWALL_DISMISSED: "paywall_dismissed",
  PRICING_PLAN_CLICKED: "pricing_plan_clicked",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_FAILED: "checkout_failed",
  CREDIT_PACK_PURCHASED: "credit_pack_purchased",
  RESTORE_PURCHASES_CLICKED: "restore_purchases_clicked",

  // ── Characters (shared with web) ──
  CHARACTER_GRID_VIEWED: "character_grid_viewed",
  CHARACTER_CREATE_STARTED: "character_create_started",
  CHARACTER_FED: "character_fed",
  CHARACTER_DRESSED: "character_dressed",

  // ── Misc (shared with web) ──
  LANGUAGE_CHANGED: "language_changed",
  FEATURE_DISCOVERED: "feature_discovered",

  // ── Challenges (MOBILE) ──
  CHALLENGE_VIEWED: "challenge_viewed",
  CHALLENGE_REWARD_CLAIMED: "challenge_reward_claimed",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
