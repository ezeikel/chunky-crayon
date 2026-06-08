import axios, { AxiosInstance } from "axios";
import { Platform } from "react-native";
import type {
  SpeciesKey,
  ColorKey,
  TraitKey,
  VoicePersonaKey,
} from "@one-colored-pixel/coloring-core/characters";
import type { AgeGroup, Difficulty } from "./types";
import {
  getAuthHeader,
  getDeviceId,
  setSessionToken,
  getSessionToken,
} from "./lib/auth";

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === "android"
    ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ??
      process.env.EXPO_PUBLIC_API_URL)
    : process.env.EXPO_PUBLIC_API_URL;

// Create axios instance with auth interceptors
const api: AxiosInstance = axios.create({
  baseURL: apiUrlFromEnv,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently registering to prevent duplicate registrations
let isRegistering = false;
let registrationPromise: Promise<void> | null = null;

/**
 * Ensure the device is registered before making API calls
 * Called automatically by the request interceptor
 */
async function ensureRegistered(): Promise<void> {
  // If already have a token, we're good
  const token = await getSessionToken();
  if (token) {
    return;
  }

  // If already registering, wait for that to complete
  if (isRegistering && registrationPromise) {
    await registrationPromise;
    return;
  }

  // Start registration
  isRegistering = true;
  registrationPromise = (async () => {
    try {
      const deviceId = await getDeviceId();
      const response = await axios.post(
        `${apiUrlFromEnv}/mobile/auth/register`,
        {
          deviceId,
        },
      );

      if (response.data.token) {
        await setSessionToken(response.data.token);
      }
    } catch (error) {
      console.error("Failed to register device:", error);
      // Don't throw - allow the request to proceed without auth
    } finally {
      isRegistering = false;
      registrationPromise = null;
    }
  })();

  await registrationPromise;
}

// Add auth header to all requests
api.interceptors.request.use(
  async (config) => {
    // Skip auth for registration endpoint
    if (config.url?.includes("/auth/register")) {
      return config;
    }

    // Ensure device is registered
    await ensureRegistered();

    // Add auth header
    const authHeader = await getAuthHeader();
    config.headers = config.headers || {};
    config.headers.Authorization = authHeader.Authorization;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ============================================================================
// Auth
// ============================================================================

export type RegisterResponse = {
  token: string;
  userId: string;
  profileId: string;
  isNew: boolean;
};

/**
 * Register the device with the server
 * Usually called automatically, but can be called manually if needed
 */
export const registerDevice = async (): Promise<RegisterResponse> => {
  const deviceId = await getDeviceId();
  const response = await axios.post(`${apiUrlFromEnv}/mobile/auth/register`, {
    deviceId,
  });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

export type AuthMeResponse = {
  authenticated: boolean;
  deviceId: string | null;
  userId: string | null;
  isLinked: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    credits: number;
  } | null;
  activeProfile: {
    id: string;
    name: string;
    avatarId: string;
    ageGroup: AgeGroup;
    difficulty: Difficulty;
    isDefault: boolean;
    coloStage: number;
  } | null;
  profiles: Array<{
    id: string;
    name: string;
    avatarId: string;
    ageGroup: AgeGroup;
    difficulty: Difficulty;
    isDefault: boolean;
    coloStage: number;
  }>;
  error?: string;
};

/**
 * Get current authentication status
 */
export const getAuthMe = async (): Promise<AuthMeResponse> => {
  const response = await api.get("/mobile/auth/me");
  return response.data;
};

export type LinkAccountResponse = {
  token: string;
  userId: string;
  profileId: string;
  linked: boolean;
  error?: string;
};

/**
 * Link device to an authenticated user (after OAuth)
 */
export const linkAccount = async (
  userId?: string,
  email?: string,
): Promise<LinkAccountResponse> => {
  const response = await api.post("/mobile/auth/link", { userId, email });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

// ============================================================================
// OAuth Sign-In
// ============================================================================

export type OAuthSignInResponse = {
  token: string;
  userId: string;
  profileId: string;
  isNewUser: boolean;
  wasMerged: boolean;
  error?: string;
};

/**
 * Sign in with Google ID token
 */
export const signInWithGoogle = async (
  idToken: string,
): Promise<OAuthSignInResponse> => {
  const response = await api.post("/mobile/auth/google", { idToken });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

/**
 * Sign in with Apple identity token
 */
export const signInWithApple = async (
  identityToken: string,
  fullName?: { givenName?: string; familyName?: string },
): Promise<OAuthSignInResponse> => {
  const response = await api.post("/mobile/auth/apple", {
    identityToken,
    fullName,
  });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

/**
 * Sign in with Facebook access token
 */
export const signInWithFacebook = async (
  accessToken: string,
): Promise<OAuthSignInResponse> => {
  const response = await api.post("/mobile/auth/facebook", { accessToken });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

/**
 * Request a magic link email
 */
export const sendMagicLink = async (
  email: string,
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await api.post("/mobile/auth/magic-link", { email });
  return response.data;
};

/**
 * Verify magic link token (called from deep link handler)
 */
export const verifyMagicLink = async (
  token: string,
): Promise<OAuthSignInResponse> => {
  const response = await api.post("/mobile/auth/magic-link/verify", { token });

  if (response.data.token) {
    await setSessionToken(response.data.token);
  }

  return response.data;
};

// ============================================================================
// Coloring Images
// ============================================================================

// Browse the public library. Optional `category` (slug) + `difficulty` filter
// the grid (the web endpoint tag-matches the category's tag set). No category
// → the full library, unchanged.
export const getColoringImages = async (
  cursor?: string,
  opts?: { category?: string; difficulty?: string },
) => {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (opts?.category) params.category = opts.category;
  if (opts?.difficulty) params.difficulty = opts.difficulty;
  const response = await api.get("/coloring-images", { params });
  return response.data;
};

// One sample page (svgUrl) per category, for the library's image-tile cards.
export type CategoryCover = { slug: string; svgUrl: string | null };
export const getCategoryCovers = async (): Promise<CategoryCover[]> => {
  const response = await api.get("/coloring-images/category-covers");
  return response.data.covers ?? [];
};

export const getColoringImage = async (id: string) => {
  const response = await api.get(`/coloring-images/${id}`);
  return response.data;
};

export const createColoringImage = async (description: string) => {
  const response = await api.post("/coloring-images", { description });
  return response.data;
};

/**
 * Magic-tools region store. Mirrors web's ColoringArea poll+retry:
 *   - checkRegionStoreReady: fresh DB read of whether the store is written.
 *   - requestRegionStoreRegeneration: re-kick the Hetzner worker to build it
 *     (the tap-to-retry on timeout). Worker takes ~60-90s; the poll picks it up.
 */
export const checkRegionStoreReady = async (
  id: string,
): Promise<{ ready: boolean }> => {
  const response = await api.get(`/mobile/coloring-images/${id}/region-store`);
  return response.data;
};

export const requestRegionStoreRegeneration = async (
  id: string,
): Promise<{ ok: boolean; error?: string }> => {
  const response = await api.post(`/mobile/coloring-images/${id}/region-store`);
  return response.data;
};

/**
 * Result of the pending/worker create flow — mirrors web's
 * CreatePendingResult exactly so the form can branch on `ok` / `error`
 * like web's CreateColoringPageForm does.
 */
export type CreatePendingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "invalid_input"
        | "moderation_blocked"
        | "insufficient_credits"
        | "trial_cap_reached"
        | "worker_unavailable"
        | "character_not_ready"
        | "unknown";
      message?: string;
      credits?: number;
    };

/**
 * Text-mode create via the WORKER/PENDING pipeline (same path web uses) —
 * inserts a GENERATING row + dispatches the Hetzner worker, returns in ~1s
 * with the row id. The app navigates to /coloring-image/{id} and polls until
 * the worker flips it to READY. Supports `characterId` so a chosen friend is
 * featured in the page (the old sync `createColoringImage` had no character
 * support).
 */
export const createPendingColoringImage = async (args: {
  description: string;
  locale?: string;
  quality?: string;
  /** Up to MAX_SUBJECTS featured characters (any mix of the kid's). */
  characterIds?: string[];
}): Promise<CreatePendingResult> => {
  const response = await api.post("/mobile/coloring-images/create", {
    mode: "text",
    description: args.description,
    locale: args.locale ?? "en",
    ...(args.quality ? { quality: args.quality } : {}),
    ...(args.characterIds && args.characterIds.length > 0
      ? { characterIds: args.characterIds }
      : {}),
  });
  return response.data as CreatePendingResult;
};

export const describeSketch = async (
  base64Image: string,
): Promise<string | null> => {
  try {
    const response = await api.post("/describe-sketch", { image: base64Image });
    return response.data.description || null;
  } catch (error) {
    console.error("Failed to describe sketch:", error);
    return null;
  }
};

/**
 * Generate a coloring page directly from a photo.
 * Uses AI to transform the photo into a coloring page that closely matches the original.
 */
export const generateFromPhoto = async (base64Image: string) => {
  const response = await api.post("/photo-to-coloring", { image: base64Image });
  return response.data;
};

/**
 * Generate a coloring page from a reference image while preserving character likeness.
 * Optionally places the character in a described scene.
 */
export const generateFromImage = async (
  base64Image: string,
  description?: string,
) => {
  const response = await api.post("/image-to-coloring", {
    image: base64Image,
    ...(description ? { description } : {}),
  });
  return response.data;
};

// ============================================================================
// User & Authentication
// ============================================================================

export type UserResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    credits: number;
    subscription: {
      planName: string;
      billingPeriod: string;
      status: string;
      currentPeriodEnd: string;
    } | null;
  } | null;
  activeProfile: {
    id: string;
    name: string;
    avatarId: string;
    ageGroup: AgeGroup;
    difficulty: Difficulty;
    artworkCount: number;
  } | null;
  stickerStats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
  error?: string;
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await api.get("/mobile/user");
  return response.data;
};

// ============================================================================
// Profiles
// ============================================================================

export type Profile = {
  id: string;
  name: string;
  avatarId: string;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  isDefault: boolean;
  artworkCount: number;
  createdAt: string;
};

export type ProfilesResponse = {
  profiles: Profile[];
  error?: string;
};

export const getProfiles = async (): Promise<ProfilesResponse> => {
  const response = await api.get("/mobile/profiles");
  return response.data;
};

export type CreateProfileInput = {
  name: string;
  avatarId?: string;
  ageGroup?: AgeGroup;
  difficulty?: Difficulty;
};

export const createProfile = async (
  input: CreateProfileInput,
): Promise<{ success: boolean; profile?: Profile; error?: string }> => {
  const response = await api.post("/mobile/profiles", input);
  return response.data;
};

export type ActiveProfileResponse = {
  activeProfile: Profile | null;
  error?: string;
};

export const getActiveProfile = async (): Promise<ActiveProfileResponse> => {
  const response = await api.get("/mobile/profiles/active");
  return response.data;
};

export const setActiveProfile = async (
  profileId: string,
): Promise<{ success: boolean; error?: string }> => {
  const response = await api.post("/mobile/profiles/active", { profileId });
  return response.data;
};

export type UpdateProfileInput = {
  name?: string;
  avatarId?: string;
  ageGroup?: AgeGroup;
  difficulty?: Difficulty;
};

export const updateProfile = async (
  profileId: string,
  input: UpdateProfileInput,
): Promise<{ success: boolean; profile?: Profile; error?: string }> => {
  const response = await api.put(`/mobile/profiles/${profileId}`, input);
  return response.data;
};

export const deleteProfile = async (
  profileId: string,
): Promise<{ success: boolean; error?: string }> => {
  const response = await api.delete(`/mobile/profiles/${profileId}`);
  return response.data;
};

// ============================================================================
// Saved Artworks
// ============================================================================

export type SavedArtwork = {
  id: string;
  title: string;
  imageUrl: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string;
  } | null;
  createdAt: string;
};

export type SavedArtworksResponse = {
  artworks: SavedArtwork[];
  error?: string;
};

export const getSavedArtworks = async (): Promise<SavedArtworksResponse> => {
  const response = await api.get("/mobile/saved-artworks");
  return response.data;
};

export type SaveArtworkInput = {
  coloringImageId: string;
  imageDataUrl: string;
  title?: string;
};

export type SaveArtworkResponse = {
  success: boolean;
  artworkId?: string;
  imageUrl?: string;
  newStickers?: Array<{
    id: string;
    name: string;
    emoji: string;
  }>;
  evolutionResult?: {
    evolved: boolean;
    previousStage: number;
    newStage: number;
    newAccessories: string[];
  } | null;
  error?: string;
};

export const saveArtwork = async (
  input: SaveArtworkInput,
): Promise<SaveArtworkResponse> => {
  const response = await api.post("/mobile/saved-artworks", input);
  return response.data;
};

// ============================================================================
// Colo Evolution
// ============================================================================

export type ColoStateResponse = {
  coloState: {
    stage: number;
    stageName: string;
    imagePath: string;
    accessories: string[];
    progressToNext: {
      current: number;
      required: number;
    } | null;
  } | null;
  error?: string;
};

export const getColoState = async (): Promise<ColoStateResponse> => {
  const response = await api.get("/mobile/colo");
  return response.data;
};

export type CheckColoEvolutionResponse = {
  coloState: ColoStateResponse["coloState"];
  evolutionResult: {
    evolved: boolean;
    previousStage: number;
    newStage: number;
    newAccessories: string[];
  } | null;
  error?: string;
};

export const checkColoEvolution = async (
  profileId?: string,
): Promise<CheckColoEvolutionResponse> => {
  const response = await api.post("/mobile/colo", { profileId });
  return response.data;
};

// ============================================================================
// Stickers
// ============================================================================

export type Sticker = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  rarity: string;
  isUnlocked: boolean;
  isNew: boolean;
  unlockedAt: string | null;
};

export type StickersResponse = {
  stickers: Sticker[];
  stats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
  error?: string;
};

export const getStickers = async (): Promise<StickersResponse> => {
  const response = await api.get("/mobile/stickers");
  return response.data;
};

export const markStickersAsViewed = async (
  stickerIds: string[],
): Promise<{ success: boolean; error?: string }> => {
  const response = await api.post("/mobile/stickers", { stickerIds });
  return response.data;
};

// ============================================================================
// Challenges
// ============================================================================

export type ChallengeType = "THEME" | "VARIETY" | "EXPLORATION" | "SEASONAL";
export type ChallengeRewardType = "sticker" | "accessory";

export type ChallengeDefinition = {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  requirement: number;
  category?: string;
  tags?: string[];
  rewardType: ChallengeRewardType;
  rewardId: string;
  icon: string;
  backgroundColor: string;
  accentColor: string;
};

export type ChallengeWithProgress = {
  challenge: ChallengeDefinition;
  weeklyChallengeId: string;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null;
  percentComplete: number;
  daysRemaining: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  rewardClaimed: boolean;
};

export type ChallengesResponse = {
  currentChallenge: ChallengeWithProgress | null;
  history: ChallengeWithProgress[];
  error?: string;
};

export const getChallenges = async (): Promise<ChallengesResponse> => {
  const response = await api.get("/mobile/challenges");
  return response.data;
};

export type ClaimChallengeRewardResponse = {
  success: boolean;
  reward?: {
    type: ChallengeRewardType;
    id: string;
  };
  error?: string;
};

export const claimChallengeReward = async (
  weeklyChallengeId: string,
): Promise<ClaimChallengeRewardResponse> => {
  const response = await api.post("/mobile/challenges/claim", {
    weeklyChallengeId,
  });
  return response.data;
};

// ============================================================================
// Feed
// ============================================================================

export type FeedColoringImage = {
  id: string;
  title: string;
  displayTitle?: string | null;
  description: string;
  alt: string;
  url: string | null;
  svgUrl: string | null;
  tags: string[];
  difficulty: string | null;
  createdAt: string;
  /** User's progress preview URL if they have in-progress work */
  previewUrl?: string | null;
};

export type FeedSavedArtwork = {
  id: string;
  title: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
  coloringImage: {
    id: string;
    title: string;
  };
};

export type FeedInProgressItem = {
  id: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    displayTitle?: string | null;
    svgUrl: string | null;
  };
  previewUrl: string | null;
  updatedAt: string;
};

export type FeedResponse = {
  todaysPick: FeedColoringImage | null;
  activeChallenge: ChallengeWithProgress | null;
  inProgressWork: FeedInProgressItem[];
  recentArt: FeedSavedArtwork[];
  myCreations: FeedColoringImage[];
  moreToColor: FeedColoringImage[];
  error?: string;
};

/**
 * Get the curated home feed for the mobile app
 * Includes today's pick, active challenge, recent art, and curated collections
 */
export const getFeed = async (): Promise<FeedResponse> => {
  const response = await api.get("/mobile/feed");
  return response.data;
};

// ============================================================================
// Entitlements / Subscriptions
// ============================================================================

export type PlanName = "SPLASH" | "RAINBOW" | "SPARKLE" | "FREE";
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAUSED"
  | "NONE";
export type SubscriptionPlatform = "STRIPE" | "REVENUECAT" | null;

export type PlanFeatures = {
  canGenerate: boolean;
  canDownload: boolean;
  canUseVoice: boolean;
  canUseCamera: boolean;
  maxProfiles: number;
  hasMagicBrush: boolean;
  hasBackgroundMusic: boolean;
  hasPrioritySupport: boolean;
  hasCommercialUse: boolean;
};

export type EntitlementsResponse = {
  hasAccess: boolean;
  plan: PlanName;
  status: SubscriptionStatus;
  platform: SubscriptionPlatform;
  expiresAt: string | null;
  isTrialing: boolean;
  isCancelled: boolean;
  credits: number;
  creditsPerMonth: number;
  features: PlanFeatures;
  error?: string;
};

/**
 * Get user's current subscription entitlements
 * Works with both web and mobile auth
 */
export const getEntitlements = async (): Promise<EntitlementsResponse> => {
  const response = await api.get("/entitlements");
  return response.data;
};

// ============================================================================
// Scene Builder — mode gating
// ============================================================================

import type { GateableMode } from "./lib/scene/modes";

export type UnlockedModesResponse = {
  unlockedModes: GateableMode[];
  error?: string;
};

/**
 * Gateable modes (text/voice/image) unlocked for the active profile.
 * Scene Builder is always available and never appears here.
 */
export const getUnlockedModes = async (): Promise<UnlockedModesResponse> => {
  const response = await api.get("/mobile/scene/unlocked-modes");
  return response.data;
};

export type SetModeUnlockedResponse = {
  success?: boolean;
  unlockedModes?: GateableMode[];
  error?: string;
};

/**
 * Toggle one gateable mode for the active profile. Unlocking is gated by
 * the client-side parent check before this is called; the authenticated
 * session is the real boundary on the server.
 */
export const setModeUnlocked = async (
  mode: GateableMode,
  unlocked: boolean,
): Promise<SetModeUnlockedResponse> => {
  const response = await api.post("/mobile/scene/unlocked-modes", {
    mode,
    unlocked,
  });
  return response.data;
};

// ============================================================================
// Characters
// ============================================================================

export type CharacterStatus = "GENERATING" | "READY" | "FAILED";

/**
 * A kid-created reusable character. Mirrors the web list select shape
 * (listCharactersForActiveProfile). Portrait generation is async: the row
 * starts GENERATING and the worker flips it to READY (portrait URLs filled)
 * or FAILED. `portraitLineArtUrl` is the line-art used as a scene subject.
 */
export type Character = {
  id: string;
  name: string;
  species: SpeciesKey;
  traits: TraitKey[];
  signatureDetails: string[];
  portraitUrl: string | null;
  portraitLineArtUrl: string | null;
  status: CharacterStatus;
  failureReason: string | null;
  voicePersona: string | null;
  equippedOutfitId: string | null;
  createdAt: string;
};

export type CharactersResponse = {
  characters: Character[];
  error?: string;
};

export const getCharacters = async (): Promise<CharactersResponse> => {
  const response = await api.get("/mobile/characters");
  return response.data;
};

export const getCharacter = async (
  id: string,
): Promise<{ character: Character } | { error: string }> => {
  const response = await api.get(`/mobile/characters/${id}`);
  return response.data;
};

export type CreateCharacterInput = {
  name: string;
  species: SpeciesKey;
  color: ColorKey;
  traits: TraitKey[];
  voicePersona?: VoicePersonaKey;
};

export type CreateCharacterResult =
  | { ok: true; characterId: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "no_active_profile"
        | "invalid_input"
        | "moderation_blocked"
        | "limit_reached"
        | "worker_unavailable"
        | "unknown";
      message?: string;
    };

export const createCharacter = async (
  input: CreateCharacterInput,
): Promise<CreateCharacterResult> => {
  const response = await api.post("/mobile/characters", input);
  return response.data;
};

export const deleteCharacter = async (
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const response = await api.delete(`/mobile/characters/${id}`);
  return response.data;
};

export const retryCharacterPortrait = async (
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const response = await api.post(`/mobile/characters/${id}/retry`);
  return response.data;
};

// ============================================================================
// Voice mode (2-turn conversation)
// ============================================================================

/**
 * Transcribe a recorded audio turn. Mobile records with expo-audio (m4a/AAC
 * on iOS) and POSTs the file as multipart — Deepgram nova-3 accepts the
 * native container directly, no client-side transcoding (verified). Mirrors
 * web's `POST /api/voice/transcribe`, which web hits with a webm blob.
 */
export type TranscribeResponse = {
  transcript: string;
  fullTranscript?: string;
  confidence?: number;
  durationMs?: number;
};

export const transcribeVoice = async (
  audioUri: string,
): Promise<TranscribeResponse> => {
  const form = new FormData();
  // RN multipart file part — { uri, name, type }. expo-audio iOS recordings
  // are m4a/AAC; the endpoint forwards the reported MIME to Deepgram.
  form.append("audio", {
    uri: audioUri,
    name: "turn.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const response = await api.post("/voice/transcribe", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Generate the dynamic follow-up question (Q2) from the kid's first answer.
 * Server runs moderation → Claude → moderation → ElevenLabs TTS and returns
 * the question text plus a playable R2 audio URL. Mirrors web's
 * `POST /api/voice/follow-up`. On a moderation block the server returns a 4xx
 * with an `error` code (too_long / blocklisted / moderation_flagged / etc.).
 */
export type FollowUpResponse = {
  followUpText: string;
  followUpAudioUrl: string;
};

export const getVoiceFollowUp = async (
  firstAnswer: string,
): Promise<FollowUpResponse> => {
  const response = await api.post("/voice/follow-up", { firstAnswer });
  return response.data;
};

/**
 * Create a coloring page from a completed voice conversation. Hits the
 * voice-specific endpoint that charges VOICE_CREDIT_COST (10) credits,
 * blocks anon users, and tags the row purposeKey:'voice' — mirroring web's
 * `createColoringImageFromVoiceConversation` action (NOT the flat-5 text
 * path). Send the raw transcripts; the server combines them.
 */
export const createColoringImageFromVoice = async (
  firstAnswer: string,
  secondAnswer: string,
) => {
  const response = await api.post("/voice/create", {
    firstAnswer,
    secondAnswer,
  });
  return response.data;
};
