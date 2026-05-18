export const uploadArtworkForSharing = async () => ({
  success: true,
  imageUrl: '/images/colo.svg',
});

export const createPendingColoringImage = async () => ({
  ok: true,
  id: 'storybook-coloring-image',
});

export const recordResourceSaved = async () => ({ ok: true });

export const joinColoringPageEmailList = async () => ({ ok: true });
export const subscribeToDailyColoring = async () => ({ ok: true });

export const loadMoreImages = async () => ({
  images: [],
  nextCursor: null,
  hasMore: false,
});

export const loadGalleryImages = async () => ({
  images: [],
  nextCursor: null,
  hasMore: false,
});

export const createShare = async () => ({
  success: true,
  shareUrl: 'https://chunkycrayon.com/shared/storybook',
});

export const transcribeAudio = async () => ({ text: 'A friendly dragon' });
export const describeImage = async () => ({ description: 'A family photo' });
export const listCharactersForPicker = async () => [];
export const listCharactersForActiveProfile = async () => [];
export const getCharacters = async () => [];
