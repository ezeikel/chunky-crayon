// Storybook stub. The real `@/app/actions/saved-artwork` pulls in
// `@/auth` → `next-auth` → server-only modules + the email action
// that imports `sendMagicLinkEmail`, none of which can bundle for
// the browser. SaveToGalleryButton is the only caller; the story
// fixture doesn't exercise the action so a no-op shim is enough.

export const saveArtworkToGallery = async () => ({
  success: true as const,
  artworkId: 'storybook-artwork',
  stickerAwarded: null,
  evolutionResult: null,
});

export const getUserSavedArtwork = async () => [];
export const getUserSavedArtworkPage = async () => ({
  artworks: [],
  nextCursor: null,
  hasMore: false,
});
export const deleteSavedArtwork = async () => ({ success: true as const });
